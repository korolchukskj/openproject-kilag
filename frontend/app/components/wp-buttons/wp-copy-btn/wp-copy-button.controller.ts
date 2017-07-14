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
    // this.WorkPackageButtonsService.copyPakcage(this.projectIdentifier);

    // let copyPromise:ng.IPromise<any> = this.WorkPackageButtonsService.copyPakcage(this.$state.params['projectPath'] || 1);
    // this.toggleDisableButton(true);
    //
    // copyPromise.then((response) => {
    //   console.log(response);
    // })
    // .catch((error) => {
    //   console.log(error);
    // })
    // .finally(() => {
    //   this.toggleDisableButton(false);
    // })


    // this.$http.get('/api/v3/work_packages/schemas/1-1').then((response) => {
    //   console.log('SCHEMA: ', response);
    // })

    this.createWorkPackage(this.$state.params['projectPath'])
      .then(wp => {

        this.$http.post('/api/v3/work_packages?notify=true', {
         "project": "demo-project",
         "subject": "new work_package",
         "description": {
           "format": "textile",
           "raw": "hallo"
         },
         "_links": {
           "project": {
        			"href": "/api/v3/projects/1"
        		},
           "type": {
             "href": "/api/v3/types/1",
             "title": "Task"
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

          // Update result list
           this.wpListService.loadCurrentResultsListFirstPage();
        }).catch((error) => {
          console.log('ERROR: ', error);
        });



        // this.newWorkPackage = wp;
        // this.wpEditModeState.start();
        // this.wpCacheService.updateWorkPackage(wp);
        //
        // if (this.$state.params['parent_id']) {
        //   scopedObservable(this.$scope, this.wpCacheService.loadWorkPackage(this.$state.params['parent_id']).values$())
        //     .subscribe(parent => {
        //       this.parentWorkPackage = parent;
        //       this.newWorkPackage.parent = parent;
        //     });
        // }
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
