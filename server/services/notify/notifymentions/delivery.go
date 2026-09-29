// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package notifymentions

import (
	"github.com/antimatterchat/antimatter-plugin-boards/server/services/notify"

	am_model "github.com/mattermost/mattermost/server/public/model"
)

// MentionDelivery provides an interface for delivering @mention notifications to other systems, such as
// channels server via plugin API.
// On success the user id of the user mentioned is returned.
type MentionDelivery interface {
	MentionDeliver(mentionedUser *am_model.User, extract string, evt notify.BlockChangeEvent) (string, error)
	UserByUsername(mentionUsername string) (*am_model.User, error)
}
