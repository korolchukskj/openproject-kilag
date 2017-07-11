import {wpButtonsModule} from '../../../angular-modules';

export default class WorkPackageCopyButtonController {
  public text:any;

  constructor(protected $state:ng.ui.IStateService,
              protected I18n:op.I18n,
              protected WorkPackageButtonsService:any) {
    this.text = {
      copyButton: 'Copy'
    }
  }

  public copyWorkPackage() {
    this.WorkPackageButtonsService.copyPakcage();
  }
}

wpButtonsModule.controller('WorkPackageCopyButtonController', WorkPackageCopyButtonController);
