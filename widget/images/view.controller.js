/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('cicdConfiguration110Ctrl', cicdConfiguration110Ctrl);

  cicdConfiguration110Ctrl.$inject = ['$q', 'API', '$resource', '$scope', 'Entity', '$http', 'connectorService', 'currentPermissionsService', 'WizardHandler', 'toaster', 'CommonUtils', '$controller', '$window', 'ALL_RECORDS_SIZE', '_', 'marketplaceService', '$state', '$timeout', '$rootScope', 'widgetBasePath'];

  function cicdConfiguration110Ctrl($q, API, $resource, $scope, Entity, $http, connectorService, currentPermissionsService, WizardHandler, toaster, CommonUtils, $controller, $window, ALL_RECORDS_SIZE, _, marketplaceService, $state, $timeout, $rootScope, widgetBasePath) {
    $controller('BaseConnectorCtrl', {
      $scope: $scope
    });
    $scope.processingPicklist = false;
    $scope.processingConnector = false;
    $scope.envCompleted = false;
    $scope.close = close;
    $scope.moveNext = moveNext;
    $scope.movePrevious = movePrevious;
    $scope.moveEnvPrevious = moveEnvPrevious;
    $scope.moveEnvironmentNext = moveEnvironmentNext;
    $scope.moveVersionControlNext = moveVersionControlNext;
    $scope.moveSourceControlNext = moveSourceControlNext;
    $scope.isLightTheme = $rootScope.theme.id === 'light';
    $scope.widgetBasePath = widgetBasePath;
    $scope.startInfoGraphics = $scope.isLightTheme ? widgetBasePath +'images/start-light.png': widgetBasePath +'images/start-dark.png';
    $scope.defineEnvironmentInfoGraphics = $scope.isLightTheme ? widgetBasePath +'images/define-environment-light.png': widgetBasePath +'images/define-environment-dark.png';
    $scope.configureSourceControlInfoGraphics = $scope.isLightTheme ? widgetBasePath +'images/configure-source-control-light.png': widgetBasePath +'images/configure-source-control-dark.png';
    $scope.selectSourceControlInfoGraphics = $scope.isLightTheme ? widgetBasePath +'images/select-source-control-light.png': widgetBasePath +'images/select-source-control-dark.png';
    $scope.finishInfoGraphics = widgetBasePath +'images/finish.png';
    $scope.saveConnector = saveConnector;
    $scope.envMacro = "cicd_env";
    $scope.formHolder = {};
    $scope.configuredEnv = {
      sourceControl: {},
      selectedEnv: {}
    };
    $scope.onEnvSelect = function ($item) {
      $scope.processingPicklist = true;
    };

    $scope.onEnvRemove = function ($item) {
      if ($scope.configuredEnv.selectedEnv.picklist.length === 0) {
        $scope.processingPicklist = false;
      }
    };

    $scope.onSourceControlSelect = function () {
      $scope.selectedSourceControl = true;
    };

    function _loadDynamicVariable(variableName) {
      var defer = $q.defer();
      var dynamicVariable = null;
      $resource(API.WORKFLOW + 'api/dynamic-variable/?offset=0&name=' + variableName).get({}, function (data) {
        if (data['hydra:member'].length > 0) {
          dynamicVariable = data['hydra:member'][0].value;
        }
        defer.resolve(dynamicVariable);
      }, function (response) {
        defer.reject(response);
      });
      return defer.promise;
    }

    function saveConnector(saveFrom) {
      $scope.isConnectorConfigured = true;
      $scope.configuredConnector = false;
      var data = angular.copy($scope.connector);
      if (CommonUtils.isUndefined(data)) {
        $scope.statusChanged = false;
        return;
      }
      if (!currentPermissionsService.availablePermission('connectors', 'update')) {
        $scope.statusChanged = false;
        return;
      }

      var newConfiguration, newConfig, deleteConfig;
      newConfiguration = false;
      if (saveFrom !== 'deleteConfigAndSave') {
        if (!_.isEmpty($scope.connector.config_schema)) {
          if (!$scope.validateConfigurationForm()) {
            return;
          }
        }
        if (!$scope.input.selectedConfiguration.id) {
          newConfiguration = true;
          $scope.input.selectedConfiguration.config_id = $window.UUID.generate();
          if ($scope.input.selectedConfiguration.default) {
            angular.forEach(data.configuration, function (configuration) {
              if (configuration.config_id !== $scope.input.selectedConfiguration.config_id) {
                configuration.default = false;
              }
            });
          }
          data.configuration.push($scope.input.selectedConfiguration);
          newConfig = $scope.input.selectedConfiguration;
        }
        delete data.newConfig;
      }

      if (saveFrom === 'deleteConfigAndSave') {
        $scope.isConnectorConfigured = false;
        deleteConfig = true;
        $scope.isConnectorHealthy = false;
      }

      var updateData = {
        connector: data.id,
        name: $scope.input.selectedConfiguration.name,
        config_id: $scope.input.selectedConfiguration.config_id,
        id: $scope.input.selectedConfiguration.id,
        default: $scope.input.selectedConfiguration.default,
        config: {},
        teams: $scope.input.selectedConfiguration.teams
      };
      $scope.saveValues($scope.input.selectedConfiguration.fields, updateData.config);
      $scope.processing = true;
      connectorService.updateConnectorConfig(updateData, newConfiguration, deleteConfig).then(function (response) {
        if (newConfig) {
          $scope.connector.configuration.push(newConfig);
          if (newConfig.default) {
            $scope.removeDefaultFromOthers();
          }

        }
        $scope.formHolder.connectorForm.$setPristine();
        if (!deleteConfig) {
          $scope.input.selectedConfiguration.id = response.id;
          $scope.configuredConnector = true;
          $scope.isConnectorHealthy = true;
        }
        $scope.checkHealth();
        $scope.statusChanged = false;
      }, function (error) {
        toaster.error({
          body: error.data.message ? error.data.message : error.data['hydra:description']
        });
      }).finally(function () {
        $scope.processing = false;
      });
    }

    function close() {
      $timeout(function () { $window.location.reload(); }, 3000);
      $state.go('main.modules.list', { module: 'change_management' }, { reload: true });
    }

    function moveNext() {
      $scope.processingPicklist = false;
      _loadDynamicVariable($scope.envMacro).then(function (dynamicVariable) {
        if (dynamicVariable !== null) {
          var jsonDynamicVariable = JSON.parse(dynamicVariable);
          var envType = jsonDynamicVariable.env_config;
          $scope.configuredEnv.selectedEnv = { "picklist": envType };
          $scope.processingPicklist = true;
        }
      });
      var entity = new Entity('change_management');
      entity.loadFields().then(function () {
        for (var key in entity.fields) {
          if (entity.fields[key].type === 'picklist' && key === 'environment') {
            $scope.picklistField = _.reject(entity.fields.environment.options, obj => obj.itemValue === 'Undefined');
          }
        }
      });
      WizardHandler.wizard('solutionpackWizard').next();
    }

    function moveEnvironmentNext() {
      _loadConnectorDetails($scope.configuredEnv.sourceControl.name, $scope.configuredEnv.sourceControl.version, $scope.configuredEnv.sourceControl);
      WizardHandler.wizard('solutionpackWizard').next();
    }

    function moveSourceControlNext() {
      $scope.selectedSourceControl = false;
      _loadDynamicVariable($scope.envMacro).then(function (dynamicVariable) {
        if (dynamicVariable !== null) {
          var jsonDynamicVariable = JSON.parse(dynamicVariable);
          var source_control = jsonDynamicVariable.source_control;
          $scope.defaultSourceControl = source_control;
          $scope.configuredEnv.sourceControl = $scope.defaultSourceControl;
          $scope.selectedSourceControl = true;
        }
      });
      WizardHandler.wizard('solutionpackWizard').next();
    }

    function moveVersionControlNext() {
      triggerPlaybook();
      WizardHandler.wizard('solutionpackWizard').next();
    }

    function movePrevious() {
      WizardHandler.wizard('solutionpackWizard').previous();
    }

    function moveEnvPrevious() {
      WizardHandler.wizard('solutionpackWizard').previous();
    }

    function _loadConnectorDetails(connectorName, connectorVersion, sourceControl) {
      $scope.processingConnector = true;
      $scope.configuredConnector = false;
      $scope.isConnectorHealthy = false;
      connectorService.getConnector(connectorName, connectorVersion).then(function (connector) {
        marketplaceService.getContentDetails(API.BASE + 'solutionpacks/' + sourceControl.uuid + '?$relationships=true').then(function (response) {
          $scope.contentDetail = response.data;
          if(connector.configuration.length > 0){
            $scope.isConnectorConfigured = true;
          connectorService.getConnectorHealth(response.data, connector.configuration[0].config_id, connector.configuration[0].agent).then(function (data) {
            if (data.status === "Available") {
              $scope.isConnectorHealthy = true;
            }
          });
        }
          else{
            $scope.isConnectorConfigured = false;
          }
        });
        if (!connector) {
          toaster.error({
            body: 'The Connector "' + connectorName + '" is not installed. Install the connector and re-run this wizard to complete the configuration'
          });
          return;
        }
        $scope.selectedConnector = connector;
        $scope.loadConnector($scope.selectedConnector, false, false);
        $scope.processingConnector = false;
      });
    }

    function triggerPlaybook() {
      var queryPayload =
      {
        "request": $scope.configuredEnv
      }
      var queryUrl = API.MANUAL_TRIGGER + '936a5236-e7ca-4c44-b3cf-cce8937df365';
      $http.post(queryUrl, queryPayload).then(function (response) {
        console.log(response);
      });
    }
    function _init() {
      var queryString = {
        $limit: ALL_RECORDS_SIZE,
        name: 'Solution Pack Category'
      };
      $resource(API.BASE + 'picklist_names').get(queryString).$promise.then(function (response) {
        var sourceCodeManagementPicklist = _.find(response['hydra:member'][0].picklists, { itemValue: 'Source Code Management' });
        var queryBody = {
          "logic": "AND",
          "filters": [
            {
              "field": "category",
              "operator": "in",
              "value": [
                sourceCodeManagementPicklist["@id"]
              ]
            }
          ]
        };
        $resource(API.QUERY + 'solutionpacks').save({ $limit: ALL_RECORDS_SIZE }, queryBody).$promise.then(function (response) {
          if (response['hydra:member'] || response['hydra:member'].length > 0) {
            $scope.sourceControls = _.map(response['hydra:member'], obj => _.pick(obj, ['name', 'label', 'version', 'uuid'])
            );
          }
        });
      });
    }
    _init();
  }
})();
