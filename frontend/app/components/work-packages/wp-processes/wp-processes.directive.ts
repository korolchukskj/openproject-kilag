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
  public typesList:any = [];

  protected firstTimeFocused: boolean = false;

  constructor(protected $http:ng.IHttpService,
              protected $scope:ng.IScope,
              protected $rootScope:ng.IRootScopeService,
              protected $stateParams:ng.ui.IStateParamsService,
              protected I18n:op.I18n,
              protected wpDisplayField:WorkPackageDisplayFieldService,
              protected wpCacheService:WorkPackageCacheService,
              protected wpEditModeState: WorkPackageEditModeStateService) {

    // Subscribe to work package
    const workPackageId = this.workPackage ? this.workPackage.id : $stateParams['workPackageId'];
    scopedObservable(
      $scope,
      wpCacheService.loadWorkPackage(workPackageId).values$())
      .subscribe((wp: WorkPackageResourceInterface) => {
        this.init(wp);
      });
  }

  public getForm() {
    console.log('++form startDate', this.wpEditModeState.getFieldValue('startDate'));
    console.log('++form dueDate', this.wpEditModeState.getFieldValue('dueDate'));
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
