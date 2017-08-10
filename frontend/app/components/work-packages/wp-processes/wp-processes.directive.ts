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

      wpCacheService.onNewWorkPackage().subscribe((success: any) => {
        console.log('++onNewWorkPackage success', success);
      }, (error: any) => {
        console.log('++onNewWorkPackage error', error);
      });
  }

  public getForm() {
    console.log('++form startDate', this.wpEditModeState.getFieldValue('startDate'));
    console.log('++form dueDate', this.wpEditModeState.getFieldValue('dueDate'));
  }

  public addTaskToSubtask() {
    this.blockViewBeforeSave();

    console.log('++this.stateParams', this.stateParams);

    let parentWP = this.getParentWP();

    console.log('++parentWP', parentWP);

    this.createWorkPackage(this.stateParams['projectPath'])
      .then(wp => {

        this.$http.post('/api/v3/work_packages?notify=true', {
         "project": this.stateParams['projectPath'],
         "subject": 'test', // item.data.subject,
         "parentId": 456, // response.data.id,
         "lockVersion": 0, // lockVersion,
         "description": {
           "format": "textile",
           "raw": ""
         },
        //  "startDate": item.data.startDate,
        //  "dueDate": item.data.dueDate,
         "_links":  Object.assign({}, parentWP.$source._links), // Object.assign({}, item.data._links)
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

  protected getParentWP() {
    return JSON.parse(`
      {
  "$source": {
    "_type": "WorkPackage",
    "id": 456,
    "lockVersion": 0,
    "subject": "5",
    "description": {
      "format": "textile",
      "raw": null,
      "html": ""
    },
    "startDate": null,
    "dueDate": null,
    "estimatedTime": null,
    "spentTime": "PT0S",
    "percentageDone": 0,
    "createdAt": "2017-08-10T08:17:51Z",
    "updatedAt": "2017-08-10T08:17:51Z",
    "customField6": null,
    "customField5": null,
    "customField1": false,
    "customField7": 1,
    "customField2": false,
    "_embedded": {
      "type": {
        "_type": "Type",
        "id": 3,
        "name": "Sub-project",
        "color": null,
        "position": 3,
        "isDefault": true,
        "isMilestone": false,
        "createdAt": "2017-07-10T12:05:23Z",
        "updatedAt": "2017-07-10T13:53:07Z",
        "attributeVisibility": {
          "assignee": "default",
          "responsible": "default",
          "estimatedTime": "default",
          "spentTime": "default",
          "customField5": "default",
          "customField6": "default",
          "customField7": "default",
          "customField8": "default",
          "customField1": "default",
          "customField2": "default",
          "category": "default",
          "percentageDone": "default",
          "priority": "default",
          "version": "default",
          "customField4": "hidden",
          "customField3": "hidden",
          "startDate": "visible",
          "dueDate": "visible"
        },
        "_links": {
          "self": {
            "href": "\/api\/v3\/types\/3",
            "title": "Sub-project"
          }
        }
      },
      "status": {
        "_type": "Status",
        "id": 1,
        "name": "New",
        "isClosed": false,
        "isDefault": true,
        "defaultDoneRatio": null,
        "position": 1,
        "_links": {
          "self": {
            "href": "\/api\/v3\/statuses\/1",
            "title": "New"
          }
        }
      },
      "author": {
        "_type": "User",
        "id": 1,
        "login": "admin",
        "admin": true,
        "subtype": "User",
        "firstName": "OpenProject",
        "lastName": "Admin",
        "name": "OpenProject Admin",
        "email": null,
        "avatar": "",
        "createdAt": "2017-07-10T12:05:47Z",
        "updatedAt": "2017-08-09T11:43:25Z",
        "status": "active",
        "identityUrl": null,
        "_links": {
          "self": {
            "href": "\/api\/v3\/users\/1",
            "title": "OpenProject Admin"
          },
          "showUser": {
            "href": "\/users\/1",
            "type": "text\/html"
          },
          "updateImmediately": {
            "href": "\/api\/v3\/users\/1",
            "title": "Update admin",
            "method": "patch"
          },
          "lock": {
            "href": "\/api\/v3\/users\/1\/lock",
            "title": "Set lock on admin",
            "method": "post"
          }
        }
      },
      "priority": {
        "_type": "Priority",
        "id": 8,
        "name": "Normal",
        "position": 2,
        "isDefault": true,
        "isActive": true,
        "_links": {
          "self": {
            "href": "\/api\/v3\/priorities\/8",
            "title": "Normal"
          }
        }
      },
      "project": {
        "_type": "Project",
        "id": 1,
        "identifier": "demo-project",
        "name": "Demo project",
        "description": "This is a description for your project. You can edit the description in the Project settings -> Description",
        "createdAt": "2017-07-10T12:05:48Z",
        "updatedAt": "2017-07-10T12:05:48Z",
        "type": null,
        "_links": {
          "self": {
            "href": "\/api\/v3\/projects\/1",
            "title": "Demo project"
          },
          "createWorkPackage": {
            "href": "\/api\/v3\/projects\/1\/work_packages\/form",
            "method": "post"
          },
          "createWorkPackageImmediate": {
            "href": "\/api\/v3\/projects\/1\/work_packages",
            "method": "post"
          },
          "categories": {
            "href": "\/api\/v3\/projects\/1\/categories"
          },
          "versions": {
            "href": "\/api\/v3\/projects\/1\/versions"
          }
        }
      },
      "watchers": {
        "_type": "Collection",
        "total": 0,
        "count": 0,
        "_embedded": {
          "elements": [

          ]
        },
        "_links": {
          "self": {
            "href": "\/api\/v3\/work_packages\/456\/watchers"
          }
        }
      },
      "attachments": {
        "_type": "Collection",
        "total": 0,
        "count": 0,
        "_embedded": {
          "elements": [

          ]
        },
        "_links": {
          "self": {
            "href": "\/api\/v3\/work_packages\/456\/attachments"
          }
        }
      },
      "relations": {
        "_type": "Collection",
        "total": 0,
        "count": 0,
        "_embedded": {
          "elements": [

          ]
        },
        "_links": {
          "self": {
            "href": "\/api\/v3\/work_packages\/456\/relations"
          }
        }
      }
    },
    "_links": {
      "self": {
        "href": "\/api\/v3\/work_packages\/456",
        "title": "5"
      },
      "update": {
        "href": "\/api\/v3\/work_packages\/456\/form",
        "method": "post"
      },
      "schema": {
        "href": "\/api\/v3\/work_packages\/schemas\/1-3"
      },
      "updateImmediately": {
        "href": "\/api\/v3\/work_packages\/456",
        "method": "patch"
      },
      "delete": {
        "href": "\/api\/v3\/work_packages\/456",
        "method": "delete"
      },
      "logTime": {
        "href": "\/work_packages\/456\/time_entries\/new",
        "type": "text\/html",
        "title": "Log time on 5"
      },
      "move": {
        "href": "\/work_packages\/456\/move\/new",
        "type": "text\/html",
        "title": "Move 5"
      },
      "copy": {
        "href": "\/work_packages\/456\/move\/new?copy=true&ids%5B%5D=456",
        "type": "text\/html",
        "title": "Copy 5"
      },
      "pdf": {
        "href": "\/work_packages\/456.pdf",
        "type": "application\/pdf",
        "title": "Export as PDF"
      },
      "atom": {
        "href": "\/work_packages\/456.atom",
        "type": "application\/rss+xml",
        "title": "Atom feed"
      },
      "available_relation_candidates": {
        "href": "\/api\/v3\/work_packages\/456\/available_relation_candidates",
        "title": "Potential work packages to relate to"
      },
      "customFields": {
        "href": "\/projects\/demo-project\/settings\/custom_fields",
        "type": "text\/html",
        "title": "Custom fields"
      },
      "configureForm": {
        "href": "\/types\/3\/edit?tab=form_configuration",
        "type": "text\/html",
        "title": "Configure form"
      },
      "type": {
        "href": "\/api\/v3\/types\/3",
        "title": "Sub-project"
      },
      "status": {
        "href": "\/api\/v3\/statuses\/1",
        "title": "New"
      },
      "author": {
        "href": "\/api\/v3\/users\/1",
        "title": "OpenProject Admin"
      },
      "responsible": {
        "href": null
      },
      "assignee": {
        "href": null
      },
      "activities": {
        "href": "\/api\/v3\/work_packages\/456\/activities"
      },
      "attachments": {
        "href": "\/api\/v3\/work_packages\/456\/attachments"
      },
      "addAttachment": {
        "href": "\/api\/v3\/work_packages\/456\/attachments",
        "method": "post"
      },
      "availableWatchers": {
        "href": "\/api\/v3\/work_packages\/456\/available_watchers"
      },
      "relations": {
        "href": "\/api\/v3\/work_packages\/456\/relations"
      },
      "revisions": {
        "href": "\/api\/v3\/work_packages\/456\/revisions"
      },
      "watch": {
        "href": "\/api\/v3\/work_packages\/456\/watchers",
        "method": "post",
        "payload": {
          "user": {
            "href": "\/api\/v3\/users\/1"
          }
        }
      },
      "watchers": {
        "href": "\/api\/v3\/work_packages\/456\/watchers"
      },
      "addWatcher": {
        "href": "\/api\/v3\/work_packages\/456\/watchers",
        "method": "post",
        "payload": {
          "user": {
            "href": "\/api\/v3\/users\/{user_id}"
          }
        },
        "templated": true
      },
      "removeWatcher": {
        "href": "\/api\/v3\/work_packages\/456\/watchers\/{user_id}",
        "method": "delete",
        "templated": true
      },
      "addRelation": {
        "href": "\/api\/v3\/work_packages\/456\/relations",
        "method": "post",
        "title": "Add relation"
      },
      "addChild": {
        "href": "\/api\/v3\/projects\/demo-project\/work_packages",
        "method": "post",
        "title": "Add child of 5"
      },
      "changeParent": {
        "href": "\/api\/v3\/work_packages\/456",
        "method": "patch",
        "title": "Change parent of 5"
      },
      "addComment": {
        "href": "\/api\/v3\/work_packages\/456\/activities",
        "method": "post",
        "title": "Add comment"
      },
      "previewMarkup": {
        "href": "\/api\/v3\/render\/textile?context=\/api\/v3\/work_packages\/456",
        "method": "post"
      },
      "parent": {
        "href": null
      },
      "timeEntries": {
        "href": "\/work_packages\/456\/time_entries",
        "type": "text\/html",
        "title": "Time entries"
      },
      "category": {
        "href": null
      },
      "priority": {
        "href": "\/api\/v3\/priorities\/8",
        "title": "Normal"
      },
      "project": {
        "href": "\/api\/v3\/projects\/1",
        "title": "Demo project"
      },
      "version": {
        "href": null
      },
      "ancestors": [

      ],
      "customField8": {
        "href": null,
        "title": null
      }
    }
  },
  "ancestors": [

  ]
}
      `);
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
