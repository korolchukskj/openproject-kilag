import {States} from "../states.service";
import {LoadingIndicatorService} from '../common/loading-indicator/loading-indicator.service';

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
                            NotificationsService:any,
                            loadingIndicator: LoadingIndicatorService) {

  let WorkPackageButtonsService = {
    copyPakcage: function (projectIdentifier:string) {
      // const PROJECT_IDENTIFIER = projectIdentifier;
      const PROJECT_IDENTIFIER = 'demo-project';
      const FOCUSED_WORK_PACKAGE_STATE_VALUE = states.focusedWorkPackage['stateValue'];

      return loadingIndicator.table.promise = $http.get(`/api/v3/projects/${PROJECT_IDENTIFIER}/work_packages`);
    }
  };

  return WorkPackageButtonsService;
}
