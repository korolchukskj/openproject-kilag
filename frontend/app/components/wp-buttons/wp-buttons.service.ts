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
      const PROJECT_IDENTIFIER = projectIdentifier;
      const FOCUSED_WORK_PACKAGE_STATE_VALUE = states.focusedWorkPackage['stateValue'];

      // console.log('wpResource', wpResource);

      $http.post('/api/v3/projects/1/work_packages/form', {
        subject: 'test subject api',
        parentId: 22,
        id: 'new'
      }).then((response) => {
        console.log('FORM RESPONSE: ', response);

        $http.post('/api/v3/work_packages', {
          subject: 'test subject api',
          parentId: 22
        }).then((response) => {
          console.log('POST RESPONSE: ', response);
        }).catch((error) => {
          console.log(error);
        });
      }).catch((error) => {
        console.log(error);
      });

      // TODO: workPackage: WorkPackageResource

      // /api/v3/work_packages/{id}/available_projects

      // $http.get('/api/v3/work_packages/4').then(function(response) {
      // $http.get(' /api/v3/projects').then(function(response) {
      // $http.get(' /api/v3/projects').then(function(response) {
      // $http.get(' /api/v3/work_packages/5').then(function(response) {
      // $http.get('/api/v3/work_packages?groupBy=type&showSums=true').then(function(response) {
      // $http.get('/api/v3/work_packages').then(function(response) {
      // $http.get('/api/v3/projects').then(function(response) {
      // $http.get('/api/v3/users').then(function(response) {
      // $http.get('/api/v3/work_packages/schemas/?filters=[{ "id": { "operator": "=", "values": ["12-1", "14-2"] } }]').then(function(response) {

      // $http.get(`/api/v3/projects`).then((response) => {
      // $http.get(`/api/v3/work_packages/${FOCUSED_WORK_PACKAGE_STATE_VALUE}`).then((response) => {
      //   console.log('response: ', response);
      // }).catch((error) => {
      //   console.log(error);
      // });
      //
      // $http.get(`/api/v3/work_packages/${FOCUSED_WORK_PACKAGE_STATE_VALUE}/relations`).then((response) => {
      //   console.log('RELATIONS: ', response);
      // }).catch((error) => {
      //   console.log(error);
      // });


      // $http.post(`/api/v3/projects/${PROJECT_IDENTIFIER}/work_packages?notify=false`, {
      //   "_type": "Error",
      //   "errorIdentifier": "urn:openproject-org:api:v3:errors:PropertyConstraintViolation",
      //   "message": "The subject might not be blank.",
      //   "_embedded": {
      //     "details": {
      //       "attribute": "Subject"
      //     }
      //   }
      // }).then((response) => {
      //   console.log(response);
      // }).catch((error) => {
      //   console.log(error);
      // })

      return loadingIndicator.table.promise = $http.get(`/api/v3/projects/${PROJECT_IDENTIFIER}/work_packages`);
    }
  };

  return WorkPackageButtonsService;
}
