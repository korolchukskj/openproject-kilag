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

import {opWorkPackagesModule} from "../../../angular-modules";
import {scopedObservable} from "../../../helpers/angular-rx-utils";
import {debugLog} from "../../../helpers/debug_output";
import {WorkPackageResourceInterface} from "../../api/api-v3/hal-resources/work-package-resource.service";
import {DisplayField} from "../../wp-display/wp-display-field/wp-display-field.module";
import {WorkPackageDisplayFieldService} from "../../wp-display/wp-display-field/wp-display-field.service";
import {WorkPackageEditFormController} from "../../wp-edit/wp-edit-form.directive";
import {WorkPackageCacheService} from "../work-package-cache.service";
import {WorkPackageEditModeStateService} from "../../wp-edit/wp-edit-mode-state.service";
import {WorkPackageCreateService} from "../../wp-create/wp-create.service";
import {WorkPackagesListService} from '../../wp-list/wp-list.service';
import {LoadingIndicatorService} from '../../common/loading-indicator/loading-indicator.service';

interface FieldDescriptor {
  name:string;
  label:string;
  field?:DisplayField;
  fields?:DisplayField[];
  spanAll:boolean;
  multiple:boolean;
}

interface GroupDescriptor {
  name:string;
  members:FieldDescriptor[];
}

export class WorkPackageProcessesViewController {
  public formCtrl: WorkPackageEditFormController;
  public workPackage: WorkPackageResourceInterface;

  // Grouped fields returned from API
  public groupedFields:GroupDescriptor[] = [];
  // Special fields (project, type)
  public specialFields:FieldDescriptor[];
  public hideEmptyFields: boolean = true;
  public text: any;
  public scope: any;
  public stateParams: any;
  public typesList:any = [];
  public parentWP: any;

  protected firstTimeFocused: boolean = false;

  constructor(public loadingIndicator: LoadingIndicatorService,
              protected $http:ng.IHttpService,
              protected $scope:ng.IScope,
              protected $rootScope:ng.IRootScopeService,
              protected $stateParams:ng.ui.IStateParamsService,
              protected I18n:op.I18n,
              protected wpDisplayField:WorkPackageDisplayFieldService,
              protected wpCacheService:WorkPackageCacheService,
              protected wpEditModeState: WorkPackageEditModeStateService,
              protected wpCreate: WorkPackageCreateService,
              protected wpListService: WorkPackagesListService) {

    // Subscribe to work package
    const workPackageId = this.workPackage ? this.workPackage.id : $stateParams['workPackageId'];
    scopedObservable(
      $scope,
      wpCacheService.loadWorkPackage(workPackageId).values$())
      .subscribe((wp: WorkPackageResourceInterface) => {
        this.init(wp);
      });

      let subscription = wpCacheService.onNewWorkPackage().subscribe((wp: any) => {
        this.parentWP = wp;
        console.log('++onNewWorkPackage success', wp);
        this.addTaskToSubtask();
      }, (error: any) => {
        console.log('++onNewWorkPackage error', error);
      });

      this.$scope.$on('$destroy', () => {
        subscription.unsubscribe();
      });
  }

  public getForm() {
    console.log('++form startDate', this.wpEditModeState.getFieldValue('startDate'));
    console.log('++form dueDate', this.wpEditModeState.getFieldValue('dueDate'));
  }

  public addTaskToSubtask() {
    this.blockViewBeforeSave();

    console.log('++this.stateParams', this.stateParams);
    console.log('++parentWP', this.parentWP);

    if (this.parentWP) {
      this.createWorkPackage(this.stateParams['projectPath'])
        .then(wp => {

          this.$http.post('/api/v3/work_packages?notify=true', {
           "project": this.stateParams['projectPath'],
           "subject": 'test', // item.data.subject,
           "parentId": this.parentWP.id, // 456, // response.data.id,
           "lockVersion": 0, // lockVersion,
           "description": {
             "format": "textile",
             "raw": ""
           },
          //  "startDate": item.data.startDate,
          //  "dueDate": item.data.dueDate,
           "_links":  Object.assign({}, this.parentWP.$source._links), // Object.assign({}, item.data._links)
          }).then((response) => {
            console.log('++response', response);

            this.refreshViewAfterSave();
          }).catch((error) => {
            throw error;
          });
        })
        .catch(error => {
          throw error
        });
    }
  }

  public calculatePeriod(types: any) {
    console.log('++types', types);

    let period = 0;

    types.forEach((type: any) => {
      if (type['checked'] === true) {
        period += type['duration'] + type['wait'];
      }
    });

    console.log('++period', period);
  }

  private blockViewBeforeSave() {
    this.loadingIndicator.table.start();
  }

  private refreshViewAfterSave() {
    document.getElementsByClassName('loading-indicator--background')[0].remove();

    let resultListPromise:ng.IPromise<any> = this.wpListService.loadCurrentResultsListFirstPage();
    // Refresh result list
    this.loadingIndicator.table.promise = resultListPromise;
    resultListPromise.then(() => {
    });
  }

  private init(wp:WorkPackageResourceInterface) {
    this.workPackage = wp;

    /* TODO: list of types needed to show like checkbox es */
    this.$http.get('/api/v3/types').then((response: any) => {
      console.log(response.data._embedded.elements);

      this.typesList = [].concat(response.data._embedded.elements.map((el: any, index: number) => {
        return {
          name: el.name,
          duration: index + 1,
          wait: index + 1,
          checked: false
        };
      }));
      console.log('++this.typesList', this.typesList);

      this.text = 'another text';
      // alert('response');

      this.getForm();
    })
  }

  protected createWorkPackage(projectIdentififer:string) {
    return this.wpCreate.createNewWorkPackage(projectIdentififer);
  }
}

function wpProcessesDirective() {

  function wpSingleViewLink(scope:ng.IScope,
                            element:ng.IAugmentedJQuery,
                            attrs:ng.IAttributes,
                            controllers: [WorkPackageEditFormController, WorkPackageProcessesViewController]) {

    controllers[1].formCtrl = controllers[0];
  }

  return {
    restrict: 'E',
    templateUrl: '/components/work-packages/wp-processes/wp-processes.directive.html',

    scope: {
      stateParams: '=',
      workPackage: '=?'
    },

    require: ['^wpEditForm', 'wpProcessesView'],
    link: wpSingleViewLink,

    bindToController: true,
    controller: WorkPackageProcessesViewController,
    controllerAs: '$ctrl'
  };
}

opWorkPackagesModule.directive('wpProcessesView', wpProcessesDirective);
