import {wpButtonsModule} from '../../../angular-modules';

export default class WorkPackageCopyButtonController {
  public text:any;
  public projectIdentifier:string;

  constructor(protected $state:ng.ui.IStateService,
              protected I18n:op.I18n,
              protected WorkPackageButtonsService:any) {
    this.text = {
      copyButton: 'Copy'
    }
  }

  public copyWorkPackage() {
    // this.WorkPackageButtonsService.copyPakcage(this.projectIdentifier);
    this.WorkPackageButtonsService.copyPakcage(this.$state.params['projectPath'] || 1);
  }
}

wpButtonsModule.controller('WorkPackageCopyButtonController', WorkPackageCopyButtonController);
