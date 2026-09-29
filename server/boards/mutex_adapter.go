// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package boards

import (
	"errors"
	"net/http"

	am_model "github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"

	"github.com/antimatterchat/antimatter-plugin-boards/server/model"
)

type mutexAPIAdapter struct {
	api model.ServicesAPI
}

func (m *mutexAPIAdapter) KVSetWithOptions(key string, value []byte, options am_model.PluginKVSetOptions) (bool, *am_model.AppError) {
	b, err := m.api.KVSetWithOptions(key, value, options)

	var appErr *am_model.AppError
	if err != nil {
		if !errors.As(err, &appErr) {
			appErr = am_model.NewAppError("KVSetWithOptions", "", nil, "", http.StatusInternalServerError)
		}
	}
	return b, appErr
}

func (m *mutexAPIAdapter) LogError(msg string, keyValuePairs ...interface{}) {
	m.api.GetLogger().Error(msg, mlog.Array("kvpairs", keyValuePairs))
}
