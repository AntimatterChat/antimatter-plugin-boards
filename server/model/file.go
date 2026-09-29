// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
package model

import (
	"mime"
	"path/filepath"
	"strings"

	"github.com/antimatterchat/antimatter-plugin-boards/server/utils"
	am_model "github.com/mattermost/mattermost/server/public/model"
)

func NewFileInfo(name string) *am_model.FileInfo {
	extension := strings.ToLower(filepath.Ext(name))
	now := utils.GetMillis()
	return &am_model.FileInfo{
		CreatorId: "boards",
		CreateAt:  now,
		UpdateAt:  now,
		Name:      name,
		Extension: extension,
		MimeType:  mime.TypeByExtension(extension),
	}
}
