"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.sec = exports.min = exports.hr = exports.InProgress = exports.Failed = exports.Success = exports.PublishHistory = exports.BuildHistory = exports.TargetDatabase = exports.TargetServer = exports.TargetPlatform = exports.Date = exports.Time = exports.Status = exports.changeTargetPlatformAction = exports.publishAction = exports.buildAction = exports.schemaCompareAction = exports.addItemAction = exports.emptyAzureDbProjectTypeDescription = exports.emptyAzureDbProjectTypeDisplayName = exports.emptyAzureDbSqlDatabaseProjectTypeId = exports.emptySdkProjectTypeDescription = exports.emptySdkProjectTypeDisplayName = exports.emptySqlDatabaseSdkProjectTypeId = exports.edgeProjectTypeDescription = exports.edgeProjectTypeDisplayName = exports.edgeSqlDatabaseProjectTypeId = exports.emptyProjectTypeDescription = exports.emptyProjectTypeDisplayName = exports.emptySqlDatabaseProjectTypeId = exports.checkoutOutputMessage = exports.runCodeAnalysisParam = exports.build = exports.dotnet = exports.sqlProjTaskType = exports.problemMatcher = exports.legacyStyleProjectStyleName = exports.sdkStyleProjectStyleName = exports.sqlProjectSdk = exports.databaseSchemaProvider = exports.MicrosoftDatatoolsSchemaSqlSql = exports.msdb = exports.master = exports.schemaCompareExtensionId = exports.openApiSpecFileExtensions = exports.publishProfileExtension = exports.sqlFileExtension = exports.sqlprojExtension = exports.dataSourcesFileName = void 0;
exports.revertSqlCmdVarsButtonTitle = exports.sqlCmdValueColumn = exports.sqlCmdVariableColumn = exports.sqlCmdVariables = exports.profileReadError = exports.loadProfilePlaceholderText = exports.noDataSourcesText = exports.dataSourceDropdownTitle = exports.connectionRadioButtonLabel = exports.dataSourceRadioButtonLabel = exports.targetConnectionLabel = exports.databaseNameLabel = exports.cancelButtonText = exports.publish = exports.publishDialogName = exports.reservedProjectFolders = exports.illegalSqlCmdChars = exports.enterNewName = exports.azureDevOpsLink = exports.sdkLearnMoreUrl = exports.learnMore = exports.reloadProject = exports.location = exports.defaultProjectNameStarter = exports.schemaObjectType = exports.schema = exports.objectType = exports.flat = exports.file = exports.publishSettingsFiles = exports.dacpacFiles = exports.selectFileString = exports.selectString = exports.okString = exports.noStringDefault = exports.noString = exports.openEulaString = exports.yesString = exports.sqlConnectionStringFriendly = exports.sqlcmdVariablesNodeName = exports.databaseReferencesNodeName = exports.refreshDataWorkspaceCommand = exports.vscodeOpenCommand = exports.mssqlPublishProjectCommand = exports.mssqlSchemaCompareCommand = exports.schemaCompareRunComparisonCommand = exports.schemaCompareStartCommand = exports.revealFileInOsCommand = exports.at = exports.msec = void 0;
exports.databaseVariable = exports.databaseName = exports.locationDropdownValues = exports.systemDbLocationDropdownValues = exports.differentDbDifferentServer = exports.differentDbSameServer = exports.sameDatabase = exports.selectDacpac = exports.versionPlaceholder = exports.version = exports.nupkgNamePlaceholder = exports.nupkgText = exports.dacpacText = exports.systemDatabase = exports.projectLabel = exports.referenceRadioButtonsGroupTitle = exports.addDatabaseReferenceOkButtonText = exports.addDatabaseReferenceDialogName = exports.OptionInclude = exports.OptionName = exports.OptionDescription = exports.ResetButton = exports.ExcludeObjectTypeTab = exports.PublishOptions = exports.AdvancedPublishOptions = exports.AdvancedOptionsButton = exports.versionMustNotBeEmpty = exports.nameMustNotBeEmpty = exports.done = exports.selectDatabase = exports.newText = exports.enterNewDatabaseName = exports.createNew = exports.resetAllVars = exports.sqlcmdVariableAlreadyExists = exports.addSqlCmdVariableWithoutDefaultValue = exports.enterNewSqlCmdVariableDefaultValue = exports.enterNewSqlCmdVariableName = exports.enterNewValueForVar = exports.chooseSqlcmdVarsToModify = exports.browseForProfileWithIcon = exports.dontUseProfile = exports.save = exports.saveProfileAsButtonText = exports.selectProfile = exports.selectProfileToUse = exports.defaultUser = exports.server = exports.selectConnection = exports.profile = void 0;
exports.compareActionRadioButtonLabel = exports.updateAction = exports.projectToUpdatePlaceholderText = exports.noSchemaCompareExtension = exports.noSqlProjFile = exports.updateText = exports.updateProjectFromDatabaseDialogName = exports.buildWithCodeAnalysisTaskName = exports.buildTaskName = exports.confirmCreateProjectWithBuildTaskDialogName = exports.ProjectDirectoryAlreadyExistError = exports.ProjectParentDirectoryNotExistError = exports.SdkLearnMorePlaceholder = exports.YesRecommended = exports.sdkStyleProject = exports.selectProjectLocation = exports.browseEllipsisWithIcon = exports.includePermissionsInProject = exports.includePermissionsLabel = exports.folderStructureLabel = exports.selectFolderStructure = exports.browseButtonText = exports.projectLocationPlaceholderText = exports.projectLocationLabel = exports.projectNamePlaceholderText = exports.projectNameLabel = exports.createProjectSettings = exports.targetProject = exports.sourceDatabase = exports.createProjectDialogOkButtonText = exports.createProjectFromDatabaseDialogName = exports.referenceTypeRadioButtonsGroupTitle = exports.packageReference = exports.artifactReference = exports.unhandledExcludeType = exports.unhandledDeleteType = exports.excludeFolderNotSupported = exports.referencedDatabaseType = exports.dacpacNotOnSameDrive = exports.dacpacMustBeOnSameDrive = exports.databaseProject = exports.otherSeverVariable = exports.otherServer = exports.databaseNameServerNameVariableRequired = exports.databaseNameRequiredVariableOptional = exports.enterSystemDbName = exports.exampleUsage = exports.suppressMissingDependenciesErrors = exports.serverVariable = exports.serverName = void 0;
exports.preDeployScriptFriendlyName = exports.sequenceFriendlyName = exports.externalStreamingJobFriendlyName = exports.externalStreamFriendlyName = exports.fileFormatFriendlyName = exports.dataSourceFriendlyName = exports.schemaFriendlyName = exports.databaseTriggerFriendlyName = exports.triggerFriendlyName = exports.tableValuedFunctionFriendlyName = exports.storedProcedureFriendlyName = exports.viewFriendlyName = exports.tableFriendlyName = exports.scriptFriendlyName = exports.folderFriendlyName = exports.folderObject = exports.fileObject = exports.excludeAction = exports.deleteAction = exports.errorRetrievingBuildFiles = exports.externalStreamingJobValidationPassed = exports.invalidProjectReload = exports.prePostDeployCount = exports.parentTreeItemUnknown = exports.outsideFolderPath = exports.databaseReferenceAlreadyExists = exports.databaseSelectionRequired = exports.invalidDatabaseReference = exports.invalidDataSchemaProvider = exports.databaseNameRequired = exports.databaseLocationRequired = exports.dacpacFileLocationRequired = exports.systemDatabaseReferenceRequired = exports.databaseReferenceTypeRequired = exports.buildFailedCannotStartSchemaCompare = exports.schemaCompareNotInstalled = exports.extractTargetRequired = exports.invalidSqlConnectionString = exports.unknownDataSourceType = exports.unrecognizedDataSourcesVersion = exports.missingVersion = exports.noDataSourcesFile = exports.noSqlProjFiles = exports.multipleSqlProjFiles = exports.equalComparison = exports.applySuccess = exports.selectProjectFile = exports.applyConfirmation = exports.actionLabel = exports.updateActionRadioButtonLabel = void 0;
exports.PropertyGroup = exports.ProjectGuid = exports.Private = exports.False = exports.True = exports.None = exports.PostDeploy = exports.PreDeploy = exports.TargetConnectionString = exports.ProjectReference = exports.RelativeOuterPath = exports.Properties = exports.DSP = exports.ServerSqlCmdVariable = exports.DatabaseSqlCmdVariable = exports.DatabaseVariableLiteralValue = exports.SuppressMissingDependenciesErrors = exports.ArtifactReference = exports.Value = exports.DefaultValue = exports.SqlCmdVariable = exports.PrivateAssets = exports.Version = exports.PackageReference = exports.Files = exports.Delete = exports.BeforeBuildTarget = exports.Name = exports.Target = exports.Condition = exports.Project = exports.Import = exports.Remove = exports.Include = exports.Folder = exports.Build = exports.ItemGroup = exports.DoNotAskAgain = exports.Install = exports.projectsOutputChannel = exports.UpdateDotnetLocation = exports.DotnetInstallationConfirmation = exports.defaultSchemaName = exports.sequencesFolderName = exports.databaseTriggersFolderName = exports.functionsFolderName = exports.securityFolderName = exports.tasksJsonFriendlyName = exports.publishProfileFriendlyName = exports.postDeployScriptFriendlyName = void 0;
exports.sameDatabaseExampleUsage = exports.systemDbs = exports.autorestProjectName = exports.specSelectionText = exports.noSqlFilesGenerated = exports.selectSpecFile = exports.runViaNpx = exports.installGlobally = exports.userSelectionCancelled = exports.userSelectionRunNpx = exports.userSelectionInstallGlobally = exports.nodeButNotAutorestFoundPrompt = exports.nodeNotFound = exports.nodeButNotAutorestFound = exports.autorestPostDeploymentScriptName = exports.DatabaseProjectItemType = exports.azureAddAccount = exports.hostnameInCertificateSetting = exports.trustServerCertificateSetting = exports.encryptSetting = exports.passwordSetting = exports.userIdSetting = exports.activeDirectoryInteractive = exports.authenticationSetting = exports.integratedSecuritySetting = exports.dataSourceSetting = exports.initialCatalogSetting = exports.targetConnectionString = exports.targetDatabaseName = exports.SqlProjPathSeparator = exports.PublishProfileElements = exports.DacpacReferenceElement = exports.ProjectReferenceElement = exports.ProjectReferenceNameElement = exports.ImportElements = exports.NoneElements = exports.PostDeployElements = exports.PreDeployElements = exports.FolderElements = exports.BuildElements = exports.AnyCPU = exports.Platform = exports.Configuration = exports.OutputPath = exports.SSDTExists = exports.VisualStudioVersion = exports.DatabaseSource = exports.Sdk = exports.ExternalStreamingJob = exports.Type = void 0;
exports.tasksJsonInvalidTasksArrayError = exports.sqlprojBuildTaskLabelPrefix = exports.processTaskType = exports.tasksJsonFileName = exports.vscodeFolderName = exports.tasksJsonVersion = exports.netCoreTargetsPathArgPrefix = exports.systemDacpacsLocationArgPrefix = exports.netCoreBuildArg = exports.updatingExistingTasksJson = exports.unhandledMoveNode = exports.move = exports.movingFilesBetweenProjectsNotSupported = exports.onlyMoveFilesFoldersSupported = exports.downloading = exports.downloadProgress = exports.downloadError = exports.mssqlEnableExperimentalFeaturesKey = exports.mssqlConfigSectionKey = exports.enablePreviewFeaturesKey = exports.microsoftBuildSqlVersionKey = exports.CollapseProjectNodesKey = exports.defaultDSP = exports.defaultTargetPlatform = exports.AzureDwFolder = exports.onPremServerVersionToTargetPlatform = exports.targetPlatformToVersion = void 0;
exports.newObjectNamePrompt = newObjectNamePrompt;
exports.deleteConfirmation = deleteConfirmation;
exports.deleteConfirmationContents = deleteConfirmationContents;
exports.deleteReferenceConfirmation = deleteReferenceConfirmation;
exports.deleteSqlCmdVariableConfirmation = deleteSqlCmdVariableConfirmation;
exports.selectTargetPlatform = selectTargetPlatform;
exports.currentTargetPlatform = currentTargetPlatform;
exports.projectUpdatedToSdkStyle = projectUpdatedToSdkStyle;
exports.convertToSdkStyleConfirmation = convertToSdkStyleConfirmation;
exports.updatedToSdkStyleError = updatedToSdkStyleError;
exports.OptionNotFoundWarningMessage = OptionNotFoundWarningMessage;
exports.applyError = applyError;
exports.updatingProjectFromDatabase = updatingProjectFromDatabase;
exports.errorPrefix = errorPrefix;
exports.compareErrorMessage = compareErrorMessage;
exports.projectNeedsUpdatingForCrossPlat = projectNeedsUpdatingForCrossPlat;
exports.updateProjectForCrossPlatform = updateProjectForCrossPlatform;
exports.updateProjectForCrossPlatformShort = updateProjectForCrossPlatformShort;
exports.updateProjectDatabaseReferencesForCrossPlatform = updateProjectDatabaseReferencesForCrossPlatform;
exports.projectAlreadyOpened = projectAlreadyOpened;
exports.projectAlreadyExists = projectAlreadyExists;
exports.noFileExist = noFileExist;
exports.fileOrFolderDoesNotExist = fileOrFolderDoesNotExist;
exports.cannotResolvePath = cannotResolvePath;
exports.fileAlreadyExists = fileAlreadyExists;
exports.folderAlreadyExists = folderAlreadyExists;
exports.folderAlreadyExistsChooseNewLocation = folderAlreadyExistsChooseNewLocation;
exports.invalidInput = invalidInput;
exports.invalidProjectPropertyValueInSqlProj = invalidProjectPropertyValueInSqlProj;
exports.invalidProjectPropertyValueProvided = invalidProjectPropertyValueProvided;
exports.unableToCreatePublishConnection = unableToCreatePublishConnection;
exports.circularProjectReference = circularProjectReference;
exports.errorFindingBuildFilesLocation = errorFindingBuildFilesLocation;
exports.projBuildFailed = projBuildFailed;
exports.unexpectedProjectContext = unexpectedProjectContext;
exports.unableToPerformAction = unableToPerformAction;
exports.unableToFindObject = unableToFindObject;
exports.deployScriptExists = deployScriptExists;
exports.cantAddCircularProjectReference = cantAddCircularProjectReference;
exports.unableToFindSqlCmdVariable = unableToFindSqlCmdVariable;
exports.unableToFindDatabaseReference = unableToFindDatabaseReference;
exports.invalidGuid = invalidGuid;
exports.invalidTargetPlatform = invalidTargetPlatform;
exports.errorReadingProject = errorReadingProject;
exports.errorAddingDatabaseReference = errorAddingDatabaseReference;
exports.errorNotSupportedInVsCode = errorNotSupportedInVsCode;
exports.sqlcmdVariableNameCannotContainWhitespace = sqlcmdVariableNameCannotContainWhitespace;
exports.sqlcmdVariableNameCannotContainIllegalChars = sqlcmdVariableNameCannotContainIllegalChars;
exports.NetCoreSupportedVersionInstallationConfirmation = NetCoreSupportedVersionInstallationConfirmation;
exports.defaultOutputPath = defaultOutputPath;
exports.generatingProjectFailed = generatingProjectFailed;
exports.multipleMostDeploymentScripts = multipleMostDeploymentScripts;
exports.generatingProjectFromAutorest = generatingProjectFromAutorest;
exports.differentDbSameServerExampleUsage = differentDbSameServerExampleUsage;
exports.differentDbDifferentServerExampleUsage = differentDbDifferentServerExampleUsage;
exports.getTargetPlatformFromVersion = getTargetPlatformFromVersion;
exports.downloadingNuget = downloadingNuget;
exports.downloadingFromTo = downloadingFromTo;
exports.extractingDacFxDlls = extractingDacFxDlls;
exports.errorDownloading = errorDownloading;
exports.errorExtracting = errorExtracting;
exports.errorMovingFile = errorMovingFile;
exports.moveConfirmationPrompt = moveConfirmationPrompt;
exports.errorRenamingFile = errorRenamingFile;
exports.getSqlProjectBuildTaskLabel = getSqlProjectBuildTaskLabel;
exports.getSqlProjectBuildTaskDetail = getSqlProjectBuildTaskDetail;
exports.tasksJsonUpdateError = tasksJsonUpdateError;
const vscode_1 = require("vscode");
const path = require("path");
const utils = require("./utils");
//#region file extensions
exports.dataSourcesFileName = "datasources.json";
exports.sqlprojExtension = ".sqlproj";
exports.sqlFileExtension = ".sql";
exports.publishProfileExtension = ".publish.xml";
exports.openApiSpecFileExtensions = ["yaml", "yml", "json"];
//#endregion
//#region Placeholder values
exports.schemaCompareExtensionId = "microsoft.schema-compare";
exports.master = "master";
exports.msdb = "msdb";
exports.MicrosoftDatatoolsSchemaSqlSql = "Microsoft.Data.Tools.Schema.Sql.Sql";
exports.databaseSchemaProvider = "DatabaseSchemaProvider";
exports.sqlProjectSdk = "Microsoft.Build.Sql";
exports.sdkStyleProjectStyleName = "SdkStyle";
exports.legacyStyleProjectStyleName = "LegacyStyle";
exports.problemMatcher = "$sqlproj-problem-matcher";
exports.sqlProjTaskType = "sqlproj-build";
exports.dotnet = "dotnet";
exports.build = "build";
exports.runCodeAnalysisParam = "/p:RunSqlCodeAnalysis=true";
exports.checkoutOutputMessage = vscode_1.l10n.t("Check output pane for more details");
//#endregion
//#region Project Provider
exports.emptySqlDatabaseProjectTypeId = "EmptySqlDbProj";
exports.emptyProjectTypeDisplayName = vscode_1.l10n.t("SQL Server Database");
exports.emptyProjectTypeDescription = vscode_1.l10n.t("Develop and publish schemas for SQL Server databases starting from an empty project");
exports.edgeSqlDatabaseProjectTypeId = "SqlDbEdgeProj";
exports.edgeProjectTypeDisplayName = vscode_1.l10n.t("Azure SQL Edge Database");
exports.edgeProjectTypeDescription = vscode_1.l10n.t("Start with the core pieces to develop and publish schemas for Azure SQL Edge Database");
exports.emptySqlDatabaseSdkProjectTypeId = "EmptySqlDbSdkProj";
exports.emptySdkProjectTypeDisplayName = vscode_1.l10n.t("SQL Database (SDK)");
exports.emptySdkProjectTypeDescription = vscode_1.l10n.t("Develop and publish schemas for SQL databases with Microsoft.Build.Sql, starting from an empty SDK-style project.");
exports.emptyAzureDbSqlDatabaseProjectTypeId = "EmptyAzureSqlDbProj";
exports.emptyAzureDbProjectTypeDisplayName = vscode_1.l10n.t("Azure SQL Database");
exports.emptyAzureDbProjectTypeDescription = vscode_1.l10n.t("Develop and publish schemas for Azure SQL Database starting from an empty project");
//#endregion
//#region Dashboard
exports.addItemAction = vscode_1.l10n.t("Add Item");
exports.schemaCompareAction = vscode_1.l10n.t("Schema Compare");
exports.buildAction = vscode_1.l10n.t("Build");
exports.publishAction = vscode_1.l10n.t("Publish");
exports.changeTargetPlatformAction = vscode_1.l10n.t("Change Target Platform");
exports.Status = vscode_1.l10n.t("Status");
exports.Time = vscode_1.l10n.t("Time");
exports.Date = vscode_1.l10n.t("Date");
exports.TargetPlatform = vscode_1.l10n.t("Target Platform");
exports.TargetServer = vscode_1.l10n.t("Target Server");
exports.TargetDatabase = vscode_1.l10n.t("Target Database");
exports.BuildHistory = vscode_1.l10n.t("Build History");
exports.PublishHistory = vscode_1.l10n.t("Publish History");
exports.Success = vscode_1.l10n.t("Success");
exports.Failed = vscode_1.l10n.t("Failed");
exports.InProgress = vscode_1.l10n.t("In progress");
exports.hr = vscode_1.l10n.t("hr");
exports.min = vscode_1.l10n.t("min");
exports.sec = vscode_1.l10n.t("sec");
exports.msec = vscode_1.l10n.t("msec");
exports.at = vscode_1.l10n.t("at");
//#endregion
//#region commands
exports.revealFileInOsCommand = "revealFileInOS";
exports.schemaCompareStartCommand = "schemaCompare.start";
exports.schemaCompareRunComparisonCommand = "schemaCompare.runComparison";
exports.mssqlSchemaCompareCommand = "mssql.schemaCompare";
exports.mssqlPublishProjectCommand = "mssql.publishDatabaseProject";
exports.vscodeOpenCommand = "vscode.open";
exports.refreshDataWorkspaceCommand = "dataworkspace.refresh";
//#endregion
//#region UI Strings
exports.databaseReferencesNodeName = vscode_1.l10n.t("Database References");
exports.sqlcmdVariablesNodeName = vscode_1.l10n.t("SQLCMD Variables");
exports.sqlConnectionStringFriendly = vscode_1.l10n.t("SQL connection string");
exports.yesString = vscode_1.l10n.t("Yes");
exports.openEulaString = vscode_1.l10n.t("Open License Agreement");
exports.noString = vscode_1.l10n.t("No");
exports.noStringDefault = vscode_1.l10n.t("No (default)");
exports.okString = vscode_1.l10n.t("Ok");
exports.selectString = vscode_1.l10n.t("Select");
exports.selectFileString = vscode_1.l10n.t("Select File");
exports.dacpacFiles = vscode_1.l10n.t("dacpac Files");
exports.publishSettingsFiles = vscode_1.l10n.t("Publish Settings File");
exports.file = vscode_1.l10n.t("File");
exports.flat = vscode_1.l10n.t("Flat");
exports.objectType = vscode_1.l10n.t("Object Type");
exports.schema = vscode_1.l10n.t("Schema");
exports.schemaObjectType = vscode_1.l10n.t("Schema/Object Type");
exports.defaultProjectNameStarter = vscode_1.l10n.t("DatabaseProject");
exports.location = vscode_1.l10n.t("Location");
exports.reloadProject = vscode_1.l10n.t("Would you like to reload your database project?");
exports.learnMore = vscode_1.l10n.t("Learn More");
exports.sdkLearnMoreUrl = "https://aka.ms/sqlprojsdk";
exports.azureDevOpsLink = "https://docs.microsoft.com/azure/azure-sql/database/local-dev-experience-overview?view=azuresql";
function newObjectNamePrompt(objectType) {
    return vscode_1.l10n.t("New {0} name:", objectType);
}
function deleteConfirmation(toDelete) {
    return vscode_1.l10n.t("Are you sure you want to delete {0}?", toDelete);
}
function deleteConfirmationContents(toDelete) {
    return vscode_1.l10n.t("Are you sure you want to delete {0} and all of its contents?", toDelete);
}
function deleteReferenceConfirmation(toDelete) {
    return vscode_1.l10n.t("Are you sure you want to delete the reference to {0}?", toDelete);
}
function deleteSqlCmdVariableConfirmation(toDelete) {
    return vscode_1.l10n.t("Are you sure you want to delete the SQLCMD Variable '{0}'?", toDelete);
}
function selectTargetPlatform(currentTargetPlatform) {
    return vscode_1.l10n.t("Current target platform: {0}. Select new target platform", currentTargetPlatform);
}
function currentTargetPlatform(projectName, currentTargetPlatform) {
    return vscode_1.l10n.t("Target platform of the project {0} is now {1}", projectName, currentTargetPlatform);
}
function projectUpdatedToSdkStyle(projectName) {
    return vscode_1.l10n.t("The project {0} has been updated to be an SDK-style project. Click 'Learn More' for details on the Microsoft.Build.Sql SDK and ways to simplify the project file.", projectName);
}
function convertToSdkStyleConfirmation(projectName) {
    return vscode_1.l10n.t("The project '{0}' will not be fully compatible with SSDT after conversion. A backup copy of the project file will be created in the project folder prior to conversion. More information is available at https://aka.ms/sqlprojsdk. Continue with converting to SDK-style project?", projectName);
}
function updatedToSdkStyleError(projectName) {
    return vscode_1.l10n.t("Converting the project {0} to SDK-style was unsuccessful. Changes to the .sqlproj have been rolled back.", projectName);
}
exports.enterNewName = vscode_1.l10n.t("Enter new name");
//#endregion
exports.illegalSqlCmdChars = ["$", "@", "#", '"', "'", "-"];
exports.reservedProjectFolders = ["Properties", "SQLCMD Variables", "Database References"];
//#region Publish dialog strings
exports.publishDialogName = vscode_1.l10n.t("Publish project");
exports.publish = vscode_1.l10n.t("Publish");
exports.cancelButtonText = vscode_1.l10n.t("Cancel");
exports.databaseNameLabel = vscode_1.l10n.t("Database");
exports.targetConnectionLabel = vscode_1.l10n.t("Connection");
exports.dataSourceRadioButtonLabel = vscode_1.l10n.t("Data sources");
exports.connectionRadioButtonLabel = vscode_1.l10n.t("Connections");
exports.dataSourceDropdownTitle = vscode_1.l10n.t("Data source");
exports.noDataSourcesText = vscode_1.l10n.t("No data sources in this project");
exports.loadProfilePlaceholderText = vscode_1.l10n.t("Load profile...");
const profileReadError = (err) => vscode_1.l10n.t("Error loading the publish profile. {0}", utils.getErrorMessage(err));
exports.profileReadError = profileReadError;
exports.sqlCmdVariables = vscode_1.l10n.t("SQLCMD Variables");
exports.sqlCmdVariableColumn = vscode_1.l10n.t("Name");
exports.sqlCmdValueColumn = vscode_1.l10n.t("Value");
exports.revertSqlCmdVarsButtonTitle = vscode_1.l10n.t("Revert values to project defaults");
exports.profile = vscode_1.l10n.t("Profile");
exports.selectConnection = vscode_1.l10n.t("Select connection");
exports.server = vscode_1.l10n.t("Server");
exports.defaultUser = vscode_1.l10n.t("default");
exports.selectProfileToUse = vscode_1.l10n.t("Select publish profile to load");
exports.selectProfile = vscode_1.l10n.t("Select Profile");
exports.saveProfileAsButtonText = vscode_1.l10n.t("Save As...");
exports.save = vscode_1.l10n.t("Save");
exports.dontUseProfile = vscode_1.l10n.t("Don't use profile");
exports.browseForProfileWithIcon = `$(folder) ${vscode_1.l10n.t("Browse for profile")}`;
exports.chooseSqlcmdVarsToModify = vscode_1.l10n.t("Choose SQLCMD variables to modify");
const enterNewValueForVar = (varName) => vscode_1.l10n.t("Enter new default value for variable '{0}'", varName);
exports.enterNewValueForVar = enterNewValueForVar;
exports.enterNewSqlCmdVariableName = vscode_1.l10n.t("Enter new SQLCMD Variable name");
const enterNewSqlCmdVariableDefaultValue = (varName) => vscode_1.l10n.t("Enter default value for SQLCMD variable '{0}'", varName);
exports.enterNewSqlCmdVariableDefaultValue = enterNewSqlCmdVariableDefaultValue;
const addSqlCmdVariableWithoutDefaultValue = (varName) => vscode_1.l10n.t("Add SQLCMD variable '{0}' to project without default value?", varName);
exports.addSqlCmdVariableWithoutDefaultValue = addSqlCmdVariableWithoutDefaultValue;
exports.sqlcmdVariableAlreadyExists = vscode_1.l10n.t("A SQLCMD Variable with the same name already exists in this project");
exports.resetAllVars = vscode_1.l10n.t("Reset all variables");
exports.createNew = vscode_1.l10n.t("Create New");
exports.enterNewDatabaseName = vscode_1.l10n.t("Enter new database name");
exports.newText = vscode_1.l10n.t("New");
exports.selectDatabase = vscode_1.l10n.t("Select database");
exports.done = vscode_1.l10n.t("Done");
exports.nameMustNotBeEmpty = vscode_1.l10n.t("Name must not be empty");
exports.versionMustNotBeEmpty = vscode_1.l10n.t("Version must not be empty");
//#endregion
//#region Publish Dialog options
exports.AdvancedOptionsButton = vscode_1.l10n.t("Advanced...");
exports.AdvancedPublishOptions = vscode_1.l10n.t("Advanced Publish Options");
exports.PublishOptions = vscode_1.l10n.t("Publish Options");
exports.ExcludeObjectTypeTab = vscode_1.l10n.t("Exclude Object Types");
exports.ResetButton = vscode_1.l10n.t("Reset");
exports.OptionDescription = vscode_1.l10n.t("Option Description");
exports.OptionName = vscode_1.l10n.t("Option Name");
exports.OptionInclude = vscode_1.l10n.t("Include");
function OptionNotFoundWarningMessage(label) {
    return vscode_1.l10n.t("label: {0} does not exist in the options value name lookup", label);
}
//#endregion
//#region Add Database Reference dialog strings
exports.addDatabaseReferenceDialogName = vscode_1.l10n.t("Add database reference");
exports.addDatabaseReferenceOkButtonText = vscode_1.l10n.t("Add reference");
exports.referenceRadioButtonsGroupTitle = vscode_1.l10n.t("Referenced Database Type");
exports.projectLabel = vscode_1.l10n.t("Project (.sqlproj)");
exports.systemDatabase = vscode_1.l10n.t("System database");
exports.dacpacText = vscode_1.l10n.t("Data-tier application (.dacpac)");
exports.nupkgText = vscode_1.l10n.t("Published data-tier application (.nupkg)");
exports.nupkgNamePlaceholder = vscode_1.l10n.t("NuGet package name");
exports.version = vscode_1.l10n.t("Version");
exports.versionPlaceholder = vscode_1.l10n.t("NuGet package version");
exports.selectDacpac = vscode_1.l10n.t("Select .dacpac");
exports.sameDatabase = vscode_1.l10n.t("Same database");
exports.differentDbSameServer = vscode_1.l10n.t("Different database, same server");
exports.differentDbDifferentServer = vscode_1.l10n.t("Different database, different server");
exports.systemDbLocationDropdownValues = [exports.differentDbSameServer];
exports.locationDropdownValues = [
    exports.sameDatabase,
    exports.differentDbSameServer,
    exports.differentDbDifferentServer,
];
exports.databaseName = vscode_1.l10n.t("Database name");
exports.databaseVariable = vscode_1.l10n.t("Database variable");
exports.serverName = vscode_1.l10n.t("Server name");
exports.serverVariable = vscode_1.l10n.t("Server variable");
exports.suppressMissingDependenciesErrors = vscode_1.l10n.t("Suppress errors caused by unresolved references in the referenced project");
exports.exampleUsage = vscode_1.l10n.t("Example Usage");
exports.enterSystemDbName = vscode_1.l10n.t("Enter a database name for this system database");
exports.databaseNameRequiredVariableOptional = vscode_1.l10n.t("A database name is required. The database variable is optional.");
exports.databaseNameServerNameVariableRequired = vscode_1.l10n.t("A database name, server name, and server variable are required. The database variable is optional");
exports.otherServer = "OtherServer";
exports.otherSeverVariable = "OtherServer";
exports.databaseProject = vscode_1.l10n.t("Database project");
exports.dacpacMustBeOnSameDrive = vscode_1.l10n.t("Dacpac references need to be located on the same drive as the project file.");
const dacpacNotOnSameDrive = (projectLocation) => {
    return vscode_1.l10n.t("Dacpac references need to be located on the same drive as the project file. The project file is located at {0}", projectLocation);
};
exports.dacpacNotOnSameDrive = dacpacNotOnSameDrive;
exports.referencedDatabaseType = vscode_1.l10n.t("Referenced Database type");
exports.excludeFolderNotSupported = vscode_1.l10n.t("Excluding folders is not yet supported");
const unhandledDeleteType = (itemType) => {
    return vscode_1.l10n.t("Unhandled item type during delete: '{0}", itemType);
};
exports.unhandledDeleteType = unhandledDeleteType;
const unhandledExcludeType = (itemType) => {
    return vscode_1.l10n.t("Unhandled item type during exclude: '{0}", itemType);
};
exports.unhandledExcludeType = unhandledExcludeType;
exports.artifactReference = vscode_1.l10n.t("Artifact Reference");
exports.packageReference = vscode_1.l10n.t("Package Reference");
exports.referenceTypeRadioButtonsGroupTitle = vscode_1.l10n.t("Reference Type");
//#endregion
//#region Create Project From Database dialog strings
exports.createProjectFromDatabaseDialogName = vscode_1.l10n.t("Create project from database");
exports.createProjectDialogOkButtonText = vscode_1.l10n.t("Create");
exports.sourceDatabase = vscode_1.l10n.t("Source database");
exports.targetProject = vscode_1.l10n.t("Target project");
exports.createProjectSettings = vscode_1.l10n.t("Settings");
exports.projectNameLabel = vscode_1.l10n.t("Name");
exports.projectNamePlaceholderText = vscode_1.l10n.t("Enter project name");
exports.projectLocationLabel = vscode_1.l10n.t("Location");
exports.projectLocationPlaceholderText = vscode_1.l10n.t("Select location to create project");
exports.browseButtonText = vscode_1.l10n.t("Browse folder");
exports.selectFolderStructure = vscode_1.l10n.t("Select folder structure");
exports.folderStructureLabel = vscode_1.l10n.t("Folder structure");
exports.includePermissionsLabel = vscode_1.l10n.t("Include permissions");
exports.includePermissionsInProject = vscode_1.l10n.t("Include permissions in project");
exports.browseEllipsisWithIcon = `$(folder) ${vscode_1.l10n.t("Browse...")}`;
exports.selectProjectLocation = vscode_1.l10n.t("Select project location");
exports.sdkStyleProject = vscode_1.l10n.t("SDK-style project");
exports.YesRecommended = vscode_1.l10n.t("Yes (Recommended)");
exports.SdkLearnMorePlaceholder = vscode_1.l10n.t('Click "Learn More" button for more information about SDK-style projects');
const ProjectParentDirectoryNotExistError = (location) => {
    return vscode_1.l10n.t("The selected project location '{0}' does not exist or is not a directory.", location);
};
exports.ProjectParentDirectoryNotExistError = ProjectParentDirectoryNotExistError;
const ProjectDirectoryAlreadyExistError = (projectName, location) => {
    return vscode_1.l10n.t("There is already a directory named '{0}' in the selected location: '{1}'.", projectName, location);
};
exports.ProjectDirectoryAlreadyExistError = ProjectDirectoryAlreadyExistError;
exports.confirmCreateProjectWithBuildTaskDialogName = vscode_1.l10n.t("Do you want to configure SQL project build as the default build configuration for this folder?");
exports.buildTaskName = vscode_1.l10n.t("Build");
exports.buildWithCodeAnalysisTaskName = vscode_1.l10n.t("Build with Code Analysis");
//#endregion
//#region Update Project From Database dialog strings
exports.updateProjectFromDatabaseDialogName = vscode_1.l10n.t("Update project from database");
exports.updateText = vscode_1.l10n.t("Update");
exports.noSqlProjFile = vscode_1.l10n.t("The selected project file does not exist");
exports.noSchemaCompareExtension = vscode_1.l10n.t("The Schema Compare extension must be installed to a update a project from a database.");
exports.projectToUpdatePlaceholderText = vscode_1.l10n.t("Select project file");
exports.updateAction = vscode_1.l10n.t("Update action");
exports.compareActionRadioButtonLabel = vscode_1.l10n.t("View changes in Schema Compare");
exports.updateActionRadioButtonLabel = vscode_1.l10n.t("Apply all changes");
exports.actionLabel = vscode_1.l10n.t("Action");
exports.applyConfirmation = vscode_1.l10n.t("Are you sure you want to update the target project?");
exports.selectProjectFile = vscode_1.l10n.t("Select project file");
//#endregion
//#region Update project from database
exports.applySuccess = vscode_1.l10n.t("Project was successfully updated.");
exports.equalComparison = vscode_1.l10n.t("The project is already up to date with the database.");
function applyError(errorMessage) {
    return vscode_1.l10n.t("There was an error updating the project: {0}", errorMessage);
}
function updatingProjectFromDatabase(projectName, databaseName) {
    return vscode_1.l10n.t("Updating {0} from {1}...", projectName, databaseName);
}
//#endregion
//#region Error messages
function errorPrefix(errorMessage) {
    return vscode_1.l10n.t("Error: {0}", errorMessage);
}
function compareErrorMessage(errorMessage) {
    return vscode_1.l10n.t("Schema Compare failed: {0}", errorMessage ? errorMessage : "Unknown");
}
exports.multipleSqlProjFiles = vscode_1.l10n.t("Multiple .sqlproj files selected; please select only one.");
exports.noSqlProjFiles = vscode_1.l10n.t("No .sqlproj file selected; please select one.");
exports.noDataSourcesFile = vscode_1.l10n.t("No {0} found", exports.dataSourcesFileName);
exports.missingVersion = vscode_1.l10n.t("Missing 'version' entry in {0}", exports.dataSourcesFileName);
exports.unrecognizedDataSourcesVersion = vscode_1.l10n.t("Unrecognized version: ");
exports.unknownDataSourceType = vscode_1.l10n.t("Unknown data source type: ");
exports.invalidSqlConnectionString = vscode_1.l10n.t("Invalid SQL connection string");
exports.extractTargetRequired = vscode_1.l10n.t("Target information for extract is required to create database project.");
exports.schemaCompareNotInstalled = vscode_1.l10n.t("Schema compare extension installation is required to run schema compare");
exports.buildFailedCannotStartSchemaCompare = vscode_1.l10n.t("Schema compare could not start because build failed");
function projectNeedsUpdatingForCrossPlat(projectName) {
    return vscode_1.l10n.t("The targets, references, and system database references need to be updated to build the project '{0}'.", projectName);
}
function updateProjectForCrossPlatform(projectName) {
    return vscode_1.l10n.t("{0} If the project was created in SSDT, it will continue to work in both tools. Do you want to update the project?", projectNeedsUpdatingForCrossPlat(projectName));
}
function updateProjectForCrossPlatformShort(projectName) {
    return vscode_1.l10n.t("Update {0} for cross-platform support?", projectName);
}
function updateProjectDatabaseReferencesForCrossPlatform(projectName) {
    return vscode_1.l10n.t("The system database references need to be updated to build the project '{0}'. If the project was created in SSDT, it will continue to work in both tools. Do you want to update the project?", projectName);
}
exports.databaseReferenceTypeRequired = vscode_1.l10n.t("Database reference type is required for adding a reference to a database");
exports.systemDatabaseReferenceRequired = vscode_1.l10n.t("System database selection is required for adding a reference to a system database");
exports.dacpacFileLocationRequired = vscode_1.l10n.t("Dacpac file location is required for adding a reference to a database");
exports.databaseLocationRequired = vscode_1.l10n.t("Database location is required for adding a reference to a database");
exports.databaseNameRequired = vscode_1.l10n.t("Database name is required for adding a reference to a different database");
exports.invalidDataSchemaProvider = vscode_1.l10n.t("Invalid DSP in .sqlproj file");
exports.invalidDatabaseReference = vscode_1.l10n.t("Invalid database reference in .sqlproj file");
exports.databaseSelectionRequired = vscode_1.l10n.t("Database selection is required to create a project from a database");
exports.databaseReferenceAlreadyExists = vscode_1.l10n.t("A reference to this database already exists in this project");
exports.outsideFolderPath = vscode_1.l10n.t("Items with absolute path outside project folder are not supported. Please make sure the paths in the project file are relative to project folder.");
exports.parentTreeItemUnknown = vscode_1.l10n.t("Cannot access parent of provided tree item");
exports.prePostDeployCount = vscode_1.l10n.t("To successfully build, update the project to have one pre-deployment script and/or one post-deployment script");
exports.invalidProjectReload = vscode_1.l10n.t("Cannot access provided database project. Only valid, open database projects can be reloaded.");
exports.externalStreamingJobValidationPassed = vscode_1.l10n.t("Validation of external streaming job passed.");
exports.errorRetrievingBuildFiles = vscode_1.l10n.t("Could not build project. Error retrieving files needed to build.");
function projectAlreadyOpened(path) {
    return vscode_1.l10n.t("Project '{0}' is already opened.", path);
}
function projectAlreadyExists(name, path) {
    return vscode_1.l10n.t("A project named {0} already exists in {1}.", name, path);
}
function noFileExist(fileName) {
    return vscode_1.l10n.t("File {0} doesn't exist", fileName);
}
function fileOrFolderDoesNotExist(name) {
    return vscode_1.l10n.t("File or directory '{0}' doesn't exist", name);
}
function cannotResolvePath(path) {
    return vscode_1.l10n.t("Cannot resolve path {0}", path);
}
function fileAlreadyExists(filename) {
    return vscode_1.l10n.t("A file with the name '{0}' already exists on disk at this location. Please choose another name.", filename);
}
function folderAlreadyExists(filename) {
    return vscode_1.l10n.t("A folder with the name '{0}' already exists on disk at this location. Please choose another name.", filename);
}
function folderAlreadyExistsChooseNewLocation(filename) {
    return vscode_1.l10n.t("A folder with the name '{0}' already exists on disk at this location. Please choose another location.", filename);
}
function invalidInput(input) {
    return vscode_1.l10n.t("Invalid input: {0}", input);
}
function invalidProjectPropertyValueInSqlProj(propertyName) {
    return vscode_1.l10n.t("Invalid value specified for the property '{0}' in .sqlproj file", propertyName);
}
function invalidProjectPropertyValueProvided(propertyName) {
    return vscode_1.l10n.t("Project property value '{0} is invalid", propertyName);
}
function unableToCreatePublishConnection(input) {
    return vscode_1.l10n.t("Unable to construct connection: {0}", input);
}
function circularProjectReference(project1, project2) {
    return vscode_1.l10n.t("Circular reference from project {0} to project {1}", project1, project2);
}
function errorFindingBuildFilesLocation(err) {
    return vscode_1.l10n.t("Error finding build files location: {0}", utils.getErrorMessage(err));
}
function projBuildFailed(errorMessage) {
    return vscode_1.l10n.t("Build failed. Check output pane for more details. {0}", errorMessage);
}
function unexpectedProjectContext(uri) {
    return vscode_1.l10n.t("Unable to establish project context.  Command invoked from unexpected location: {0}", uri);
}
function unableToPerformAction(action, uri, error) {
    return vscode_1.l10n.t("Unable to locate '{0}' target: '{1}'. {2}", action, uri, error);
}
function unableToFindObject(path, objType) {
    return vscode_1.l10n.t("Unable to find {1} with path '{0}'", path, objType);
}
function deployScriptExists(scriptType) {
    return vscode_1.l10n.t("A {0} script already exists. The new script will not be included in build.", scriptType);
}
function cantAddCircularProjectReference(project) {
    return vscode_1.l10n.t("A reference to project '{0}' cannot be added. Adding this project as a reference would cause a circular dependency", project);
}
function unableToFindSqlCmdVariable(variableName) {
    return vscode_1.l10n.t("Unable to find SQLCMD variable '{0}'", variableName);
}
function unableToFindDatabaseReference(reference) {
    return vscode_1.l10n.t("Unable to find database reference {0}", reference);
}
function invalidGuid(guid) {
    return vscode_1.l10n.t("Specified GUID is invalid: {0}", guid);
}
function invalidTargetPlatform(targetPlatform, supportedTargetPlatforms) {
    return vscode_1.l10n.t("Invalid target platform: {0}. Supported target platforms: {1}", targetPlatform, supportedTargetPlatforms.toString());
}
function errorReadingProject(section, path, error) {
    return vscode_1.l10n.t("Error trying to read {0} of project '{1}'. {2}", section, path, error);
}
function errorAddingDatabaseReference(referenceName, error) {
    return vscode_1.l10n.t("Error adding database reference to {0}. Error: {1}", referenceName, error);
}
function errorNotSupportedInVsCode(actionDescription) {
    return vscode_1.l10n.t("Error: {0} is not currently supported in SQL Database Projects for VS Code.", actionDescription);
}
function sqlcmdVariableNameCannotContainWhitespace(name) {
    return vscode_1.l10n.t("SQLCMD variable name '{0}' cannot contain whitespace", name);
}
function sqlcmdVariableNameCannotContainIllegalChars(name) {
    return vscode_1.l10n.t("SQLCMD variable name '{0}' cannot contain any of the following characters: {1}", name, exports.illegalSqlCmdChars.join(", "));
}
//#endregion
// Action types
exports.deleteAction = vscode_1.l10n.t("Delete");
exports.excludeAction = vscode_1.l10n.t("Exclude");
// Project tree object types
exports.fileObject = vscode_1.l10n.t("file");
exports.folderObject = vscode_1.l10n.t("folder");
//#region Project script types
exports.folderFriendlyName = vscode_1.l10n.t("Folder");
exports.scriptFriendlyName = vscode_1.l10n.t("Script");
exports.tableFriendlyName = vscode_1.l10n.t("Table");
exports.viewFriendlyName = vscode_1.l10n.t("View");
exports.storedProcedureFriendlyName = vscode_1.l10n.t("Stored Procedure");
exports.tableValuedFunctionFriendlyName = vscode_1.l10n.t("Table-Valued Function");
exports.triggerFriendlyName = vscode_1.l10n.t("Trigger");
exports.databaseTriggerFriendlyName = vscode_1.l10n.t("Database Trigger");
exports.schemaFriendlyName = vscode_1.l10n.t("Schema");
exports.dataSourceFriendlyName = vscode_1.l10n.t("Data Source");
exports.fileFormatFriendlyName = vscode_1.l10n.t("File Format");
exports.externalStreamFriendlyName = vscode_1.l10n.t("External Stream");
exports.externalStreamingJobFriendlyName = vscode_1.l10n.t("External Streaming Job");
exports.sequenceFriendlyName = vscode_1.l10n.t("Sequence");
exports.preDeployScriptFriendlyName = vscode_1.l10n.t("Script.PreDeployment");
exports.postDeployScriptFriendlyName = vscode_1.l10n.t("Script.PostDeployment");
exports.publishProfileFriendlyName = vscode_1.l10n.t("Publish Profile");
exports.tasksJsonFriendlyName = vscode_1.l10n.t("Tasks.json");
//#region Default folder paths for item types
// Maps item types to their default folder locations when created at project root
// These follow SSDT conventions for folder structure
exports.securityFolderName = "Security";
exports.functionsFolderName = "Functions";
exports.databaseTriggersFolderName = "DatabaseTriggers";
exports.sequencesFolderName = "Sequences";
exports.defaultSchemaName = "dbo";
//#endregion
//#endregion
//#region Build
exports.DotnetInstallationConfirmation = vscode_1.l10n.t("The .NET SDK cannot be located. Project build will not work. Please install .NET 8 SDK or higher or update the .NET SDK location in settings if already installed.");
function NetCoreSupportedVersionInstallationConfirmation(installedVersion) {
    return vscode_1.l10n.t("Currently installed .NET SDK version is {0}, which is not supported. Project build will not work. Please install .NET 8 SDK or higher or update the .NET SDK supported version location in settings if already installed.", installedVersion);
}
exports.UpdateDotnetLocation = vscode_1.l10n.t("Update Location");
exports.projectsOutputChannel = vscode_1.l10n.t("Database Projects");
//#endregion
// Prompt buttons
exports.Install = vscode_1.l10n.t("Install");
exports.DoNotAskAgain = vscode_1.l10n.t("Don't Ask Again");
//#region SqlProj file XML names
exports.ItemGroup = "ItemGroup";
exports.Build = "Build";
exports.Folder = "Folder";
exports.Include = "Include";
exports.Remove = "Remove";
exports.Import = "Import";
exports.Project = "Project";
exports.Condition = "Condition";
exports.Target = "Target";
exports.Name = "Name";
exports.BeforeBuildTarget = "BeforeBuild";
exports.Delete = "Delete";
exports.Files = "Files";
exports.PackageReference = "PackageReference";
exports.Version = "Version";
exports.PrivateAssets = "PrivateAssets";
exports.SqlCmdVariable = "SqlCmdVariable";
exports.DefaultValue = "DefaultValue";
exports.Value = "Value";
exports.ArtifactReference = "ArtifactReference";
exports.SuppressMissingDependenciesErrors = "SuppressMissingDependenciesErrors";
exports.DatabaseVariableLiteralValue = "DatabaseVariableLiteralValue";
exports.DatabaseSqlCmdVariable = "DatabaseSqlCmdVariable";
exports.ServerSqlCmdVariable = "ServerSqlCmdVariable";
exports.DSP = "DSP";
exports.Properties = "Properties";
exports.RelativeOuterPath = "..";
exports.ProjectReference = "ProjectReference";
exports.TargetConnectionString = "TargetConnectionString";
exports.PreDeploy = "PreDeploy";
exports.PostDeploy = "PostDeploy";
exports.None = "None";
exports.True = "True";
exports.False = "False";
exports.Private = "Private";
exports.ProjectGuid = "ProjectGuid";
exports.PropertyGroup = "PropertyGroup";
exports.Type = "Type";
exports.ExternalStreamingJob = "ExternalStreamingJob";
exports.Sdk = "Sdk";
exports.DatabaseSource = "DatabaseSource";
exports.VisualStudioVersion = "VisualStudioVersion";
exports.SSDTExists = "SSDTExists";
exports.OutputPath = "OutputPath";
exports.Configuration = "Configuration";
exports.Platform = "Platform";
exports.AnyCPU = "AnyCPU";
exports.BuildElements = vscode_1.l10n.t("Build Elements");
exports.FolderElements = vscode_1.l10n.t("Folder Elements");
exports.PreDeployElements = vscode_1.l10n.t("PreDeploy Elements");
exports.PostDeployElements = vscode_1.l10n.t("PostDeploy Elements");
exports.NoneElements = vscode_1.l10n.t("None Elements");
exports.ImportElements = vscode_1.l10n.t("Import Elements");
exports.ProjectReferenceNameElement = vscode_1.l10n.t("Project reference name element");
exports.ProjectReferenceElement = vscode_1.l10n.t("Project reference");
exports.DacpacReferenceElement = vscode_1.l10n.t("Dacpac reference");
exports.PublishProfileElements = vscode_1.l10n.t("Publish profile elements");
//#endregion
function defaultOutputPath(configuration) {
    return path.join(".", "bin", configuration);
}
/**
 * Path separator to use within SqlProj file for `Include`, `Exclude`, etc. attributes.
 * This matches Windows path separator, as expected by SSDT.
 */
exports.SqlProjPathSeparator = "\\";
// Profile XML names
exports.targetDatabaseName = "TargetDatabaseName";
exports.targetConnectionString = "TargetConnectionString";
//#region SQL connection string components
exports.initialCatalogSetting = "Initial Catalog";
exports.dataSourceSetting = "Data Source";
exports.integratedSecuritySetting = "Integrated Security";
exports.authenticationSetting = "Authentication";
exports.activeDirectoryInteractive = "active directory interactive";
exports.userIdSetting = "User ID";
exports.passwordSetting = "Password";
exports.encryptSetting = "Encrypt";
exports.trustServerCertificateSetting = "Trust Server Certificate";
exports.hostnameInCertificateSetting = "Host Name in Certificate";
exports.azureAddAccount = vscode_1.l10n.t("Add an Account...");
//#endregion
//#region Tree item types
var DatabaseProjectItemType;
(function (DatabaseProjectItemType) {
    DatabaseProjectItemType["project"] = "databaseProject.itemType.project";
    DatabaseProjectItemType["legacyProject"] = "databaseProject.itemType.legacyProject";
    DatabaseProjectItemType["folder"] = "databaseProject.itemType.folder";
    DatabaseProjectItemType["file"] = "databaseProject.itemType.file";
    DatabaseProjectItemType["externalStreamingJob"] = "databaseProject.itemType.file.externalStreamingJob";
    DatabaseProjectItemType["table"] = "databaseProject.itemType.file.table";
    DatabaseProjectItemType["referencesRoot"] = "databaseProject.itemType.referencesRoot";
    DatabaseProjectItemType["reference"] = "databaseProject.itemType.reference";
    DatabaseProjectItemType["sqlProjectReference"] = "databaseProject.itemType.reference.sqlProject";
    DatabaseProjectItemType["dataSourceRoot"] = "databaseProject.itemType.dataSourceRoot";
    DatabaseProjectItemType["sqlcmdVariablesRoot"] = "databaseProject.itemType.sqlcmdVariablesRoot";
    DatabaseProjectItemType["sqlcmdVariable"] = "databaseProject.itemType.sqlcmdVariable";
    DatabaseProjectItemType["preDeploymentScript"] = "databaseProject.itemType.file.preDeploymentScript";
    DatabaseProjectItemType["postDeploymentScript"] = "databaseProject.itemType.file.postDeployScript";
    DatabaseProjectItemType["noneFile"] = "databaseProject.itemType.file.noneFile";
    DatabaseProjectItemType["sqlObjectScript"] = "databaseProject.itemType.file.sqlObjectScript";
    DatabaseProjectItemType["publishProfile"] = "databaseProject.itemType.file.publishProfile";
})(DatabaseProjectItemType || (exports.DatabaseProjectItemType = DatabaseProjectItemType = {}));
//#endregion
//#region AutoRest
exports.autorestPostDeploymentScriptName = "PostDeploymentScript.sql";
exports.nodeButNotAutorestFound = vscode_1.l10n.t("Autorest tool not found in system path, but found Node.js.  Prompting user for how to proceed.  Execute 'npm install autorest -g' to install permanently and avoid this message.");
exports.nodeNotFound = vscode_1.l10n.t("Neither Autorest nor Node.js (npx) found in system path.  Please install Node.js for Autorest generation to work.");
exports.nodeButNotAutorestFoundPrompt = vscode_1.l10n.t("Autorest is not installed. To proceed, choose whether to run Autorest from a temporary location via 'npx' or install Autorest globally then run.");
exports.userSelectionInstallGlobally = vscode_1.l10n.t("User selected to install autorest gloablly.  Installing now...");
exports.userSelectionRunNpx = vscode_1.l10n.t("User selected to run via npx.");
exports.userSelectionCancelled = vscode_1.l10n.t("User has cancelled selection for how to run autorest.");
exports.installGlobally = vscode_1.l10n.t("Install globally");
exports.runViaNpx = vscode_1.l10n.t("Run via npx");
exports.selectSpecFile = vscode_1.l10n.t("Select OpenAPI/Swagger spec file");
function generatingProjectFailed(errorMessage) {
    return vscode_1.l10n.t("Generating project via AutoRest failed.  Check output pane for more details. Error: {0}", errorMessage);
}
exports.noSqlFilesGenerated = vscode_1.l10n.t("No .sql files were generated by Autorest. Please confirm that your spec contains model definitions, or check the output log for details.");
function multipleMostDeploymentScripts(count) {
    return vscode_1.l10n.t("Unexpected number of {0} files: {1}", exports.autorestPostDeploymentScriptName, count);
}
exports.specSelectionText = vscode_1.l10n.t("OpenAPI/Swagger spec");
exports.autorestProjectName = vscode_1.l10n.t("New SQL project name");
function generatingProjectFromAutorest(specName) {
    return vscode_1.l10n.t("Generating new SQL project from {0}...  Check output window for details.", specName);
}
//#endregion
// System dbs
exports.systemDbs = ["master", "msdb", "tempdb", "model"];
// SQL queries
exports.sameDatabaseExampleUsage = "SELECT * FROM [Schema1].[Table1]";
function differentDbSameServerExampleUsage(db) {
    return `SELECT * FROM [${db}].[Schema1].[Table1]`;
}
function differentDbDifferentServerExampleUsage(server, db) {
    return `SELECT * FROM [${server}].[${db}].[Schema1].[Table1]`;
}
//#endregion
//#region Target platforms
exports.targetPlatformToVersion = new Map([
    // Note: the values here must match values from Microsoft.Data.Tools.Schema.SchemaModel.SqlPlatformNames
    ["SQL Server 2012" /* SqlTargetPlatform.sqlServer2012 */, "110"],
    ["SQL Server 2014" /* SqlTargetPlatform.sqlServer2014 */, "120"],
    ["SQL Server 2016" /* SqlTargetPlatform.sqlServer2016 */, "130"],
    ["SQL Server 2017" /* SqlTargetPlatform.sqlServer2017 */, "140"],
    ["SQL Server 2019" /* SqlTargetPlatform.sqlServer2019 */, "150"],
    ["SQL Server 2022" /* SqlTargetPlatform.sqlServer2022 */, "160"],
    ["SQL Server 2025" /* SqlTargetPlatform.sqlServer2025 */, "170"],
    ["Azure SQL Database" /* SqlTargetPlatform.sqlAzure */, "AzureV12"],
    ["Azure Synapse SQL Pool" /* SqlTargetPlatform.sqlDW */, "Dw"],
    ["Azure Synapse Serverless SQL Pool" /* SqlTargetPlatform.sqlDwServerless */, "Serverless"],
    ["Synapse Data Warehouse in Microsoft Fabric" /* SqlTargetPlatform.sqlDwUnified */, "DwUnified"],
    ["SQL database in Fabric (preview)" /* SqlTargetPlatform.sqlDbFabric */, "DbFabric"],
]);
exports.onPremServerVersionToTargetPlatform = new Map([
    [11, "SQL Server 2012" /* SqlTargetPlatform.sqlServer2012 */],
    [12, "SQL Server 2014" /* SqlTargetPlatform.sqlServer2014 */],
    [13, "SQL Server 2016" /* SqlTargetPlatform.sqlServer2016 */],
    [14, "SQL Server 2017" /* SqlTargetPlatform.sqlServer2017 */],
    [15, "SQL Server 2019" /* SqlTargetPlatform.sqlServer2019 */],
    [16, "SQL Server 2022" /* SqlTargetPlatform.sqlServer2022 */],
    [17, "SQL Server 2025" /* SqlTargetPlatform.sqlServer2025 */],
]);
// DW is special since the system dacpac folder has a different name from the target platform
exports.AzureDwFolder = "AzureDw";
exports.defaultTargetPlatform = "SQL Server 2025" /* SqlTargetPlatform.sqlServer2025 */;
exports.defaultDSP = exports.targetPlatformToVersion.get(exports.defaultTargetPlatform);
/**
 * Returns the name of the target platform of the version of sql
 * @param version version of sql
 * @returns target platform name
 */
function getTargetPlatformFromVersion(version) {
    return Array.from(exports.targetPlatformToVersion.keys()).filter((k) => exports.targetPlatformToVersion.get(k) === version)[0];
}
//#endregion
//#region Configuration keys
exports.CollapseProjectNodesKey = "collapseProjectNodes";
exports.microsoftBuildSqlVersionKey = "microsoftBuildSqlVersion";
exports.enablePreviewFeaturesKey = "enablePreviewFeatures";
exports.mssqlConfigSectionKey = "mssql";
exports.mssqlEnableExperimentalFeaturesKey = "enableExperimentalFeatures";
//#endregion
//#region httpClient
exports.downloadError = vscode_1.l10n.t("Download error");
exports.downloadProgress = vscode_1.l10n.t("Download progress");
exports.downloading = vscode_1.l10n.t("Downloading");
//#endregion
//#region buildHelper
function downloadingNuget(nuget) {
    return vscode_1.l10n.t("Downloading {0} nuget to get build DLLs ", nuget);
}
function downloadingFromTo(from, to) {
    return vscode_1.l10n.t("Downloading from {0} to {1}", from, to);
}
function extractingDacFxDlls(location) {
    return vscode_1.l10n.t("Extracting DacFx build DLLs to {0}", location);
}
function errorDownloading(url, error) {
    return vscode_1.l10n.t("Error downloading {0}. Error: {1}", url, error);
}
function errorExtracting(path, error) {
    return vscode_1.l10n.t("Error extracting files from {0}. Error: {1}", path, error);
}
//#endregion
//#region move
exports.onlyMoveFilesFoldersSupported = vscode_1.l10n.t("Only moving files and folders are supported");
exports.movingFilesBetweenProjectsNotSupported = vscode_1.l10n.t("Moving files between projects is not supported");
function errorMovingFile(source, destination, error) {
    return vscode_1.l10n.t("Error when moving file from {0} to {1}. Error: {2}", source, destination, error);
}
function moveConfirmationPrompt(source, destination) {
    return vscode_1.l10n.t("Are you sure you want to move {0} to {1}?", source, destination);
}
exports.move = vscode_1.l10n.t("Move");
function errorRenamingFile(source, destination, error) {
    return vscode_1.l10n.t("Error when renaming file from {0} to {1}. Error: {2}", source, destination, error);
}
exports.unhandledMoveNode = vscode_1.l10n.t("Unhandled node type for move");
//#endregion
//#region tasks.json
exports.updatingExistingTasksJson = vscode_1.l10n.t("A SQL Projects build task has been added to the existing tasks.json file.");
exports.netCoreBuildArg = "/p:NetCoreBuild=true";
exports.systemDacpacsLocationArgPrefix = "/p:SystemDacpacsLocation=";
exports.netCoreTargetsPathArgPrefix = "/p:NETCoreTargetsPath=";
exports.tasksJsonVersion = "2.0.0";
exports.vscodeFolderName = ".vscode";
exports.tasksJsonFileName = "tasks.json";
exports.processTaskType = "process";
exports.sqlprojBuildTaskLabelPrefix = "sqlproj: Build";
function getSqlProjectBuildTaskLabel(projectName) {
    return `${exports.sqlprojBuildTaskLabelPrefix} ${projectName}`;
}
function getSqlProjectBuildTaskDetail(projectName) {
    return vscode_1.l10n.t("Builds the {0} SQL project", projectName);
}
function tasksJsonUpdateError(error) {
    return vscode_1.l10n.t("Error updating existing tasks.json: {0}", error);
}
exports.tasksJsonInvalidTasksArrayError = vscode_1.l10n.t("Invalid format in tasks.json: expected 'tasks' to be an array. Please fix the tasks.json file and try again.");
//#endregion
//# sourceMappingURL=constants.js.map