import {wpButtonsModule} from '../../../angular-modules';
import {WorkPackageResource} from '../../api/api-v3/hal-resources/work-package-resource.service';

import {WorkPackageTableSelection} from '../../wp-fast-table/state/wp-table-selection.service';
import {WorkPackageEditModeStateService} from "../../wp-edit/wp-edit-mode-state.service";

import {WorkPackageCreateService} from "../../wp-create/wp-create.service";
import {WorkPackageCacheService} from "../../work-packages/work-package-cache.service";
import {scopedObservable} from "../../../helpers/angular-rx-utils";
import {RootDmService} from '../../api/api-v3/hal-resource-dms/root-dm.service';
import {RootResource} from '../../api/api-v3/hal-resources/root-resource.service';
import {WorkPackageNotificationService} from "../../wp-edit/wp-notification.service";

import {WorkPackagesListService} from '../../wp-list/wp-list.service';

import {States} from "../../states.service";

import {LoadingIndicatorService} from '../../common/loading-indicator/loading-indicator.service';

import IPromise = angular.IPromise;

export default class WorkPackageCopyButtonController {
  public newWorkPackage:WorkPackageResource|any;
  public parentWorkPackage:WorkPackageResource|any;

  public text:any;
  public projectIdentifier:string;
  public activeState:string = 'work-packages.copy-package';

  public disableButton:boolean;

  public wpResource: WorkPackageResource;

  constructor(public $scope:ng.IScope,
              public wpTableSelection:WorkPackageTableSelection,
              public loadingIndicator: LoadingIndicatorService,
              protected $http:ng.IHttpService,
              protected $window:ng.IWindowService,
              protected $state:ng.ui.IStateService,
              protected I18n:op.I18n,
              protected WorkPackageButtonsService:any,
              protected WorkPackageService:any,
              protected wpEditModeState: WorkPackageEditModeStateService,
              protected wpCreate: WorkPackageCreateService,
              protected wpCacheService:WorkPackageCacheService,
              protected RootDm:RootDmService,
              protected $location:ng.ILocationService,
              protected wpNotificationsService: WorkPackageNotificationService,
              protected wpListService:WorkPackagesListService) {
    this.text = {
      copyButton: 'Copy'
    }

    // setTimeout(() => {
    //   this.$http.get('/api/v3/queries/7?offset=1&pageSize=100').then((response:any) => {
    //     console.log('QUERIES: ', response);
    //
    //     this.loadingIndicator.table.promise = this.wpListService.reloadQuery(response.data);
    //
    //   });
    // }, 7000);
  }

  public copySelectedWorkPackages(link:any) {
    let selected = this.getSelectedWorkPackages();

    if (selected.length > 1) {
      this.$window.location.href = link;
      return;
    }

    var params = {
      copiedFromWorkPackageId: selected[0].id
    };

    this.$state.transitionTo('work-packages.list.copy', params);

    console.log('wpEditModeState: ', this.wpEditModeState);
    this.wpEditModeState.save();
  }

  public copyWorkPackage() {
    let wpObjectToBeCreated = {};
    let selectedPakcage:any = this.getSelectedWorkPackages();

    let parentId:number = selectedPakcage[0].$source.id
    let lockVersion:number = 0;


    // this.WorkPackageButtonsService.copyPakcage(parentId).then((response:any) => {
    //   console.log('WORK PACKAGE SERVICE: ', response);
    // }).catch((error:any) => {
    //   console.log(error);
    // })

    console.log('State params: ', this.$state.params);
    console.log('SELECTED PACKAGE: ', selectedPakcage);

    this.loadingIndicator.table.start();
    this.toggleDisableButton(true);

    // Get info about the certain package;
    this.$http.get(`/api/v3/work_packages/${parentId}`).then((parentWorkPackageResponse:any) => {

      console.log('SELECTED PACKAGE RESPONSE: ', parentWorkPackageResponse);

      if (!parentWorkPackageResponse.data._links.children) {
        alert('This work package cannot be copied');
        document.getElementsByClassName('loading-indicator--background')[0].remove();
        this.toggleDisableButton(false);
        throw {};
      }

      let listOfPromises:any = [];


      // Create parent sub-project work package;
      console.log('VIEW WORK PACKAGE: ', parentWorkPackageResponse);
      console.log('STATE PARAMS: ', this.$state.params['projectPath']);

      this.createWorkPackage(this.$state.params['projectPath'])
        .then(wp => {

          this.$http.post('/api/v3/work_packages?notify=true', {
           "project": this.$state.params['projectPath'],
           "subject": parentWorkPackageResponse.data.subject,
           "parentId": "",
           "lockVersion": lockVersion,
           "description": {
             "format": "textile",
             "raw": ""
           },
           "_type": "WorkPackage",
           "_links": {
             "project": {
          			"href": "/api/v3/projects/1"
          		},
             "type": {
               "href": "/api/v3/types/3"
             },
             "status": {
               "href": "/api/v3/statuses/1"
             },
             "priority": {
               "href": "/api/v3/priorities/8",
               "title": "Normal"
             }
           }
         }).then((response:any) => {

            console.log('CREATE PACKAGE RESPONSE: ', response);
            let listOfChildrenHref:any = [];

            // here we can create every single child of the parent;

            // 1. fetch work packages info, so we can copy the 'type' properly;
            parentWorkPackageResponse.data._links.children.forEach((item:any) => {
              listOfChildrenHref.push(this.$http.get(item.href));
            });

            Promise.all(listOfChildrenHref).then((listOfWorkPackagesResponse:any) => {
              // 2. create children of sub-project;

              console.log('LIST OF WORK PACKAGES: ', listOfWorkPackagesResponse);

              if (listOfWorkPackagesResponse) {

                // listOfWorkPackagesResponse.data._links.children.forEach((item:any) => {
                listOfWorkPackagesResponse.forEach((item:any) => {
                  listOfPromises.push(
                    this.createWorkPackage(this.$state.params['projectPath'])
                      .then(wp => {

                        this.$http.post('/api/v3/work_packages?notify=true', {
                         "project": this.$state.params['projectPath'],
                         "subject": item.data.subject,
                         "parentId": response.data.id,
                         "lockVersion": lockVersion,
                         "description": {
                           "format": "textile",
                           "raw": ""
                         },
                         "_links": {
                           "project": {
                        			"href": "/api/v3/projects/1"
                        		},
                           "type": {
                             "href": item.data._embedded.type._links.self.href
                           },
                           "status": {
                             "href": "/api/v3/statuses/1"
                           },
                           "priority": {
                             "href": "/api/v3/priorities/8",
                             "title": "Normal"
                           }
                         }
                        }).then((response) => {

                        }).catch((error) => {
                          throw error;
                        });
                      })
                      .catch(error => {
                        throw error
                      })
                  );
                });
              }


              console.log('LIST OF PROMISES: ', listOfPromises);


              Promise.all(listOfPromises).then((resulst) => {
                document.getElementsByClassName('loading-indicator--background')[0].remove();

                let resultListPromise:ng.IPromise<any> = this.wpListService.loadCurrentResultsListFirstPage();
                // Refresh result list
                this.loadingIndicator.table.promise = resultListPromise;
                resultListPromise.then(() => {
                  this.toggleDisableButton(false);
                })
              }).catch((error) => {
                throw error;
              })
            });
          }).catch((error) => {
            throw error;
          })
        })
        .catch(error => {
          if (error.errorIdentifier == "urn:openproject-org:api:v3:errors:MissingPermission") {
            this.RootDm.load().then((root:RootResource) => {
              if (!root.user) {
                // Not logged in
                let url: string = this.$location.absUrl();
                this.$location.path('/login').search({back_url: url});
                let loginUrl: string = this.$location.absUrl();
                window.location.href = loginUrl;
              };
            });
            this.wpNotificationsService.handleErrorResponse(error);
          };
        });
    });
  }

  protected createWorkPackage(projectIdentififer:string) {
    return this.wpCreate.createNewWorkPackage(projectIdentififer);
  }

  protected newWorkPackageFromParams(stateParams: any) {
    const type = parseInt(stateParams.type);

    console.log('TYPE: ', type);
    console.log('STATE PARAMS: ', type);

    return this.wpCreate.createNewTypedWorkPackage(stateParams.projectPath, type);
  }

  private isDisabled() {
    return this.disableButton;
  }

  private toggleDisableButton(state: boolean) {
    this.disableButton = state;
  }

  public getSelectedWorkPackages() {

    console.log('SELECTED WORK PACKAGE: ', this.wpTableSelection.getSelectedWorkPackages());

    // let workPackagefromContext = this.$scope.row.object;
    let workPackagefromContext = this.wpTableSelection.getSelectedWorkPackages()[0] ;
    let selectedWorkPackages = this.wpTableSelection.getSelectedWorkPackages();

    if (selectedWorkPackages.length === 0) {
      return [workPackagefromContext];
    }

    if (selectedWorkPackages.indexOf(workPackagefromContext) === -1) {
      selectedWorkPackages.push(workPackagefromContext);
    }

    return selectedWorkPackages;
  }
}

wpButtonsModule.controller('WorkPackageCopyButtonController', WorkPackageCopyButtonController);
