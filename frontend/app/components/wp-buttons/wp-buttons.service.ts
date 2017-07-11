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

      console.log(states.focusedWorkPackage);

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

      loadingIndicator.table.promise = $http.get(`/api/v3/projects/${PROJECT_IDENTIFIER}/work_packages`).then(function(response) {
        console.log(response);
      }, function(error) {
        console.log(error);
      });
    }
  };

  return WorkPackageButtonsService;
}
