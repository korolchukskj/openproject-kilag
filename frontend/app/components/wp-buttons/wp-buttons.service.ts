import {States} from "../states.service";
angular
    .module('openproject.services')
    .factory('WorkPackageButtonsService', WorkPackageButtonsService);

function WorkPackageButtonsService($http:ng.IHttpService,
                            $window:ng.IWindowService,
                            $cacheFactory:any,
                            $state:ng.ui.IStateService,
                            states:States,
                            I18n:op.I18n,
                            PathHelper:any,
                            UrlParamsHelper:any,
                            NotificationsService:any) {

  let WorkPackageButtonsService = {
    copyPakcage: function () {
      // copy functionality goes here;
    }
  };

  return WorkPackageButtonsService;
}
