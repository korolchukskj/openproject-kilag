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
  public typesListOptions:any = [];
  public parentWP: any;
  public dueDate: any;

  public selectModel = {
    value: ''
  };

  protected firstTimeFocused: boolean = false;

  constructor(public loadingIndicator: LoadingIndicatorService,
              protected $http:ng.IHttpService,
              protected $scope:ng.IScope,
              protected $rootScope:ng.IRootScopeService,
              protected $stateParams:ng.ui.IStateParamsService,
              protected $filter: any,
              protected I18n:op.I18n,
              protected wpDisplayField:WorkPackageDisplayFieldService,
              protected wpCacheService:WorkPackageCacheService,
              protected wpEditModeState: WorkPackageEditModeStateService,
              protected wpCreate: WorkPackageCreateService,
              protected wpListService: WorkPackagesListService) {

    // Subscribe to work package
    const workPackageId = this.workPackage ? this.workPackage.id : $stateParams['workPackageId'];
    // Form-change subscription
    scopedObservable(
      $scope,
      wpCacheService.loadWorkPackage(workPackageId).values$())
      .subscribe((wp: WorkPackageResourceInterface) => {
        this.init(wp);
      });

    // On-Save-Project subscription
    let subscription = wpCacheService.onNewWorkPackage().subscribe((wp: any) => {
      this.parentWP = wp;
      // console.log('++onNewWorkPackage success', wp);

      let subTasks = this.buildTasksList(this.typesList);

      if (subTasks.length) {
        // this.addTaskToSubtask(subTasks[0]);
        this.processAddTasks(subTasks);
      }
    }, (error: any) => {
      console.log('++onNewWorkPackage error', error);
    });

    // On-Save-Project unsubscribe
    this.$scope.$on('$destroy', () => {
      subscription.unsubscribe();
    });
  }

  public onSelectOption(optionName: string) {
    // console.log('++optionName', optionName);

    // operations with typeList
    let typesListOption = this.typesList.find((el: any) => {
      return el.name === optionName;
    });

    let optionIndex = 0;
    for(var i = 0, len = this.typesList.length; i < len; i++) {
      if (this.typesList[i].name === optionName) {
        optionIndex = i;
        break;
      }
    }

    if (typesListOption) {
      typesListOption['checked'] = true;
    }

    this.typesList.splice(i, 1);
    this.typesList.push(typesListOption);

    // operations with typesListOptions
    let selectedOption = this.typesList.find((el: any) => {
      return el.name === optionName;
    });

    selectedOption['visible'] = false;

    this.recalculateTypeListDates(optionName);
  }

  // recalculates start/due Dates of typeList items
  // from startDate - it is endDate of ParentTask
  // modifyers this.typeList
  public recalculateTypeListDates(optionName: string = '') {
    let fieldValue = this.wpEditModeState.getFieldValue('customField7' ? 'customField7' : 'dueDate'), //in case database changes customField7 should be replaced with new custom field ID
        startDate = (fieldValue) ? new Date(fieldValue) : '',
        typesList: Array<any> = this.typesList,
        checkedIndex = 0;

    if (startDate) {
      typesList.forEach((type) => {
        if (type.checked) {
          let to = new Date(startDate),
              from = new Date(startDate),
              duration = type.duration || 0,
              wait = (checkedIndex === 0) ? 0 : type.wait || 0;

          // we don't need to wait if it is first task
          from.setDate(from.getDate() - (duration + wait));

          type['startDate'] = this.$filter('date')(from, 'yyyy-MM-dd');
          type['dueDate'] = this.$filter('date')(to, 'yyyy-MM-dd');

          // override startDate
          // with start Date of prev. type
          startDate = new Date(from);
          // endDate = prevStartDate - 1
          startDate.setDate(startDate.getDate() - 1);

          checkedIndex++;
        } else {
          type['startDate'] = '';
          type['dueDate'] = '';
        }
      });
    }

    // operations with typesListOptions
    if (this.typesListOptions) {
      let selectedOption = this.typesListOptions.find((el: any) => {
        return el.name === optionName;
      });

      let typesListOption = this.typesList.find((el: any) => {
        return el.name === optionName;
      });

      if (selectedOption) {
        selectedOption['visible'] = (typesListOption['checked']) ? false : true;
      }
    }

    // console.log('++typesListOptions', this.typesListOptions);
  }

  public buildTasksList(typesList: Array<any>) {
    return typesList
      .filter((task: any) => task.checked)
      .map((task: any) => {
        return {
          subject: task.name,
          type: task.name,
          startDate: task.startDate,
          dueDate: task.dueDate
        };
      });
  }

  public processAddTasks(taskList: Array<any>) {
    let listOfPromises:any = [];

    taskList.forEach((task: any) => {
      listOfPromises.push(
        this.addTaskToSubtask(task)
      );
    });

    // show loader
    this.blockViewBeforeSave();

    Promise.all(listOfPromises).then((results) => {
      // hide loader
      this.refreshViewAfterSave();
    }).catch((error) => {
      throw error;
    });
  }

  public addTaskToSubtask(dataParams: any) {
    // console.log('++this.stateParams', this.stateParams);
    // console.log('++parentWP', this.parentWP);

    this.createWorkPackage(this.stateParams['projectPath'])
      .then(wp => {

        this.$http.post('/api/v3/work_packages?notify=true', {
         "project": this.stateParams['projectPath'],
         "subject": dataParams['subject'], // 'test', // item.data.subject,
         "parentId": this.parentWP.id, // 456, // response.data.id,
         "lockVersion": 0, // lockVersion,
         "description": {
           "format": "textile",
           "raw": ""
         },
         "startDate": dataParams['startDate'], //item.data.startDate,
         "dueDate": dataParams['dueDate'],// item.data.dueDate,
         "type": dataParams['type'], // Object.assign({}, item.data._links)
         "_links": Object.assign({}, this.parentWP.$source._links), // Object.assign({}, item.data._links)
        }).then((response) => {
          // console.log('++response', response);
        }).catch((error) => {
          throw error;
        });
      })
      .catch(error => {
        throw error
      });
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

    if (this.typesList.length === 0) {
      this.$http.get('/api/v3/types').then((response: any) => {
        // console.log(response.data._embedded.elements);
        let elements = response.data._embedded.elements.filter((el: any) => {
          return el['isDefault'] !== true;
        });

        this.typesList = [].concat(elements.map((el: any, index: number) => {
          return {
            name: el.name,
            duration: 1,
            wait: 1,
            checked: false,
            startDate: '',
            dueDate: ''
          };
        }));

        this.typesListOptions = this.typesList.slice();
        this.typesListOptions.forEach((el: any) => {
          el['visible'] = true;
        });
        // console.log('++this.typesList', this.typesList);

        this.recalculateTypeListDates();
      });
    } else {
      this.recalculateTypeListDates();
    }
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
