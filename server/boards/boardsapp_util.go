// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package boards

import (
	"math"
	"path"
	"strings"

	"github.com/antimatterchat/antimatter-plugin-boards/server/services/config"

	am_model "github.com/mattermost/mattermost/server/public/model"
)

const defaultS3Timeout = 60 * 1000 // 60 seconds

func createBoardsConfig(amconfig am_model.Config, baseURL string, serverID string) *config.Configuration {
	filesS3Config := config.AmazonS3Config{}
	if amconfig.FileSettings.AmazonS3AccessKeyId != nil {
		filesS3Config.AccessKeyID = *amconfig.FileSettings.AmazonS3AccessKeyId
	}
	if amconfig.FileSettings.AmazonS3SecretAccessKey != nil {
		filesS3Config.SecretAccessKey = *amconfig.FileSettings.AmazonS3SecretAccessKey
	}
	if amconfig.FileSettings.AmazonS3Bucket != nil {
		filesS3Config.Bucket = *amconfig.FileSettings.AmazonS3Bucket
	}
	if amconfig.FileSettings.AmazonS3PathPrefix != nil {
		filesS3Config.PathPrefix = *amconfig.FileSettings.AmazonS3PathPrefix
	}
	if amconfig.FileSettings.AmazonS3Region != nil {
		filesS3Config.Region = *amconfig.FileSettings.AmazonS3Region
	}
	if amconfig.FileSettings.AmazonS3Endpoint != nil {
		filesS3Config.Endpoint = *amconfig.FileSettings.AmazonS3Endpoint
	}
	if amconfig.FileSettings.AmazonS3SSL != nil {
		filesS3Config.SSL = *amconfig.FileSettings.AmazonS3SSL
	}
	if amconfig.FileSettings.AmazonS3SignV2 != nil {
		filesS3Config.SignV2 = *amconfig.FileSettings.AmazonS3SignV2
	}
	if amconfig.FileSettings.AmazonS3SSE != nil {
		filesS3Config.SSE = *amconfig.FileSettings.AmazonS3SSE
	}
	if amconfig.FileSettings.AmazonS3Trace != nil {
		filesS3Config.Trace = *amconfig.FileSettings.AmazonS3Trace
	}
	if amconfig.FileSettings.AmazonS3RequestTimeoutMilliseconds != nil && *amconfig.FileSettings.AmazonS3RequestTimeoutMilliseconds > 0 {
		filesS3Config.Timeout = *amconfig.FileSettings.AmazonS3RequestTimeoutMilliseconds
	} else {
		filesS3Config.Timeout = defaultS3Timeout
	}

	enableTelemetry := false
	if amconfig.LogSettings.EnableDiagnostics != nil {
		enableTelemetry = *amconfig.LogSettings.EnableDiagnostics
	}

	enablePublicSharedBoards := false
	if amconfig.PluginSettings.Plugins[PluginName][SharedBoardsName] == true {
		enablePublicSharedBoards = true
	}

	enableBoardsDeletion := false
	if amconfig.DataRetentionSettings.EnableBoardsDeletion != nil {
		enableBoardsDeletion = true
	}

	// Removed from the server config in v12, so the pointer is nil there.
	boardsRetentionDays := am_model.DataRetentionSettingsDefaultBoardsRetentionDays
	if amconfig.DataRetentionSettings.BoardsRetentionDays != nil {
		boardsRetentionDays = *amconfig.DataRetentionSettings.BoardsRetentionDays
	}

	featureFlags := parseFeatureFlags(amconfig.FeatureFlags.ToMap())

	showEmailAddress := false
	if amconfig.PrivacySettings.ShowEmailAddress != nil {
		showEmailAddress = *amconfig.PrivacySettings.ShowEmailAddress
	}

	showFullName := false
	if amconfig.PrivacySettings.ShowFullName != nil {
		showFullName = *amconfig.PrivacySettings.ShowFullName
	}

	serverRoot := baseURL + "/plugins/focalboard"

	return &config.Configuration{
		ServerRoot:               serverRoot,
		Port:                     -1,
		DBType:                   *amconfig.SqlSettings.DriverName,
		DBConfigString:           *amconfig.SqlSettings.DataSource,
		DBTablePrefix:            "focalboard_",
		UseSSL:                   false,
		SecureCookie:             true,
		WebPath:                  path.Join(*amconfig.PluginSettings.Directory, "focalboard", "pack"),
		FilesDriver:              *amconfig.FileSettings.DriverName,
		FilesPath:                *amconfig.FileSettings.Directory,
		FilesS3Config:            filesS3Config,
		MaxFileSize:              *amconfig.FileSettings.MaxFileSize,
		Telemetry:                enableTelemetry,
		TelemetryID:              serverID,
		WebhookUpdate:            []string{},
		SessionExpireTime:        2592000,
		SessionRefreshTime:       18000,
		LocalOnly:                false,
		EnableLocalMode:          false,
		LocalModeSocketLocation:  "",
		AuthMode:                 "mattermost",
		EnablePublicSharedBoards: enablePublicSharedBoards,
		FeatureFlags:             featureFlags,
		NotifyFreqCardSeconds:    getPluginSettingInt(amconfig, notifyFreqCardSecondsKey, 120),
		NotifyFreqBoardSeconds:   getPluginSettingInt(amconfig, notifyFreqBoardSecondsKey, 86400),
		EnableDataRetention:      enableBoardsDeletion,
		DataRetentionDays:        boardsRetentionDays,
		TeammateNameDisplay:      *amconfig.TeamSettings.TeammateNameDisplay,
		ShowEmailAddress:         showEmailAddress,
		ShowFullName:             showFullName,
	}
}

func parseFeatureFlags(configFeatureFlags map[string]string) map[string]string {
	featureFlags := make(map[string]string)
	for key, value := range configFeatureFlags {
		// Break out FeatureFlags and pass remaining
		if key == boardsFeatureFlagName {
			for _, flag := range strings.Split(value, "-") {
				featureFlags[flag] = "true"
			}
		} else {
			featureFlags[key] = value
		}
	}
	return featureFlags
}

func getPluginSetting(amConfig am_model.Config, key string) (interface{}, bool) {
	plugin, ok := amConfig.PluginSettings.Plugins[PluginName]
	if !ok {
		return nil, false
	}

	val, ok := plugin[key]
	if !ok {
		return nil, false
	}
	return val, true
}

func getPluginSettingInt(amConfig am_model.Config, key string, def int) int {
	val, ok := getPluginSetting(amConfig, key)
	if !ok {
		return def
	}
	valFloat, ok := val.(float64)
	if !ok {
		return def
	}
	return int(math.Round(valFloat))
}
