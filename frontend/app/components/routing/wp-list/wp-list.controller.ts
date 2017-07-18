// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
// ++

import {scopeDestroyed$, scopedObservable} from "../../../helpers/angular-rx-utils";
import {QueryResource} from "../../api/api-v3/hal-resources/query-resource.service";
import {LoadingIndicatorService} from "../../common/loading-indicator/loading-indicator.service";
import {States} from "../../states.service";
import {WorkPackageTableColumnsService} from "../../wp-fast-table/state/wp-table-columns.service";
import {WorkPackageTableFiltersService} from "../../wp-fast-table/state/wp-table-filters.service";
import {WorkPackageTableGroupByService} from "../../wp-fast-table/state/wp-table-group-by.service";
import {WorkPackageTablePaginationService} from "../../wp-fast-table/state/wp-table-pagination.service";
import {WorkPackageTableSortByService} from "../../wp-fast-table/state/wp-table-sort-by.service";
import {WorkPackageTableSumService} from "../../wp-fast-table/state/wp-table-sum.service";
import {WorkPackageTablePagination} from "../../wp-fast-table/wp-table-pagination";
import {WorkPackageTableHierarchiesService} from './../../wp-fast-table/state/wp-table-hierarchy.service';
import {WorkPackagesListChecksumService} from "../../wp-list/wp-list-checksum.service";
import {WorkPackagesListService} from "../../wp-list/wp-list.service";
import {WorkPackageTableTimelineService} from "../../wp-fast-table/state/wp-table-timeline.service";
import {WorkPackageTableBaseService} from "../../wp-fast-table/state/wp-table-base.service";
import {
  WorkPackageTableBaseState,
  WorkPackageTableQueryState
} from "../../wp-fast-table/wp-table-base";
import {WorkPackageTableRefreshService} from "../../wp-table/wp-table-refresh-request.service";
import {debugLog} from "../../../helpers/debug_output";

function WorkPackagesListController($scope:any,
                                    $state:ng.ui.IStateService,
                                    AuthorisationService:any,
                                    states:States,
                                    wpTableRefresh:WorkPackageTableRefreshService,
                                    wpTableColumns:WorkPackageTableColumnsService,
                                    wpTableSortBy:WorkPackageTableSortByService,
                                    wpTableGroupBy:WorkPackageTableGroupByService,
                                    wpTableFilters:WorkPackageTableFiltersService,
                                    wpTableSum:WorkPackageTableSumService,
                                    wpTableTimeline:WorkPackageTableTimelineService,
                                    wpTableHierarchies:WorkPackageTableHierarchiesService,
                                    wpTablePagination:WorkPackageTablePaginationService,
                                    wpListService:WorkPackagesListService,
                                    wpListChecksumService:WorkPackagesListChecksumService,
                                    loadingIndicator:LoadingIndicatorService,
                                    I18n:op.I18n) {

  $scope.projectIdentifier = $state.params['projectPath'] || null;
  $scope.I18n = I18n;
  $scope.text = {
    'jump_to_pagination': I18n.t('js.work_packages.jump_marks.pagination'),
    'text_jump_to_pagination': I18n.t('js.work_packages.jump_marks.label_pagination')
  };

  // Setup
  function initialSetup() {
    const loadingRequired = wpListChecksumService.isUninitialized();

    // Listen to changes on the query state objects
    setupQueryObservers();

    //  Require initial loading of the list if not yet done
    if (loadingRequired) {
      wpTableRefresh.clear('Impending query loading.');
      loadQuery();
    }

    // Listen for refresh changes
    setupRefreshObserver();
  }

  // Teardown
  $scope.$on('$destroy', () => {
    wpTableRefresh.clear('Table controller scope destroyed.');
  });

  function setupQueryObservers() {

    scopedObservable($scope, states.table.query.values$())
      .withLatestFrom(
        wpTablePagination.observeOnScope($scope)
      ).subscribe(([query, pagination]) => {
      $scope.tableInformationLoaded = true;

      updateTitle(query);

      wpListChecksumService.updateIfDifferent(query, pagination as WorkPackageTablePagination);
    });

    wpTablePagination.observeOnScope($scope)
      .withLatestFrom(scopedObservable($scope, states.table.query.values$()))
      .subscribe(([pagination, query]) => {
      if (wpListChecksumService.isQueryOutdated(query, pagination as WorkPackageTablePagination)) {
        wpListChecksumService.update(query, pagination as WorkPackageTablePagination);

        updateResultsVisibly();
      }
    });

    setupChangeObserver(wpTableFilters);
    setupChangeObserver(wpTableGroupBy);
    setupChangeObserver(wpTableSortBy);
    setupChangeObserver(wpTableSum);
    setupChangeObserver(wpTableTimeline, false);
    setupChangeObserver(wpTableTimeline, false);
    setupChangeObserver(wpTableHierarchies, false);
    setupChangeObserver(wpTableColumns, false);
  }

  function setupChangeObserver(service:WorkPackageTableBaseService, triggerUpdate:boolean = true) {
    const queryState = states.table.query;

    states.table.context.fireOnStateChange(service.state, 'Query loaded')
      .values$()
      .takeUntil(scopeDestroyed$($scope))
      .filter(() => !isAnyDependentStateClear()) // Avoid updating while not all states are initialized
      .filter(() => queryState.hasValue())
      .filter((stateValue:WorkPackageTableQueryState) => stateValue.hasChanged(queryState.value!))
      .subscribe((stateValue:WorkPackageTableQueryState) => {
        const newQuery = queryState.value!;
        stateValue.applyToQuery(newQuery);
        states.table.query.putValue(newQuery);

        if (triggerUpdate) {
          updateResultsVisibly(true);
        }
      });
  }

  /**
   * Setup the listener for members of the table to request a refresh of the entire table
   * through the refresh service.
   */
  function setupRefreshObserver() {
    wpTableRefresh.state
      .values$('Refresh listener in wp-list.controller')
      .takeUntil(scopeDestroyed$($scope))
      .subscribe((refreshVisibly:boolean) => {
        if (refreshVisibly) {
          debugLog("Refreshing work package results visibly.");
          updateResultsVisibly();
        } else {
          debugLog("Refreshing work package results in the background.");
          updateResults();
        }
      });
  }

  function loadQuery() {
    wpListChecksumService.clear();
    loadingIndicator.table.promise = wpListService.fromQueryParams($state.params, $scope.projectIdentifier);
  }

  $scope.setAnchorToNextElement = function () {
    // Skip to next when visible, otherwise skip to previous
    const selectors = '#pagination--next-link, #pagination--prev-link, #pagination-empty-text';
    const visibleLink = jQuery(selectors)
                          .not(':hidden')
                          .first();

   if (visibleLink.length) {
     visibleLink.focus();
   }
  };

  function updateResults() {
    return wpListService.reloadCurrentResultsList();
  }

  function updateToFirstResultsPage() {
    return wpListService.loadCurrentResultsListFirstPage();
  }

  function updateResultsVisibly(firstPage:boolean = false) {
    if (firstPage) {
      loadingIndicator.table.promise = updateToFirstResultsPage();
    } else {
      loadingIndicator.table.promise = updateResults();
    }
  }

  $scope.allowed = function(model:string, permission:string) {
    return AuthorisationService.can(model, permission);
  };

  initialSetup();

  function updateTitle(query:QueryResource) {
    if (query.id) {
      $scope.selectedTitle = query.name;
    } else {
      $scope.selectedTitle = I18n.t('js.label_work_package_plural');
    }
  }

  $scope.$watchCollection(
    () => {
      return {
        query_id: $state.params['query_id'],
        query_props: $state.params['query_props']
      };
    },
    (params:any) => {
      let newChecksum = params.query_props;
      let newId = params.query_id && parseInt(params.query_id);

      wpListChecksumService.executeIfOutdated(newId,
                                              newChecksum,
                                              loadQuery);
    });

  // The combineLatest retains the last value of each observable regardless of
  // whether it has become null|undefined in the meantime.
  // As we alter the query's property from it's dependent states, we have to ensure
  // that we do not set them if he dependent state does depend on another query with
  // the value only being available because it is still retained.
  function isAnyDependentStateClear() {
    return !states.table.pagination.value ||
      !states.table.filters.value ||
      !states.table.columns.value ||
      !states.table.sortBy.value ||
      !states.table.groupBy.value ||
      !states.table.timelineVisible.value ||
      !states.table.hierarchies.value ||
      !states.table.sum.value;
  }
}

angular
  .module('openproject.workPackages.controllers')
  .controller('WorkPackagesListController', WorkPackagesListController);
