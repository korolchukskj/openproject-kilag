import {wpButtonsModule} from '../../../angular-modules';

export default class WorkPackageCopyButtonController {
  public text:any;
  public projectIdentifier:string;
  public activeState:string = 'work-packages.copy-package';

  public disableButton:boolean;

  constructor(protected $state:ng.ui.IStateService,
              protected I18n:op.I18n,
              protected WorkPackageButtonsService:any) {
    this.text = {
      copyButton: 'Copy'
    }
  }

  public copyWorkPackage() {
    // this.WorkPackageButtonsService.copyPakcage(this.projectIdentifier);
    let copyPromise:ng.IPromise<any> = this.WorkPackageButtonsService.copyPakcage(this.$state.params['projectPath'] || 1);
    this.toggleDisableButton(true);

    copyPromise.then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error);
    })
    .finally(() => {
      this.toggleDisableButton(false);
    })
  }

  public isDisabled() {
    return this.disableButton;
  }

  public toggleDisableButton(state: boolean) {
    this.disableButton = state;
  }
}

wpButtonsModule.controller('WorkPackageCopyButtonController', WorkPackageCopyButtonController);
