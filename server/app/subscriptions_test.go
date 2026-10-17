// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package app

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/antimatterchat/antimatter-plugin-boards/server/model"
	"github.com/antimatterchat/antimatter-plugin-boards/server/services/notify"
)

// Creating a board from a template subscribes its creator to the new cards from the notification
// queue. When the board is deleted before the queue gets there, the block is gone: the subscription
// change used to dereference a nil board and panic.
func TestNotifySubscriptionChangedForAMissingBlock(t *testing.T) {
	th, tearDown := SetupTestHelper(t)
	defer tearDown()

	notifications, err := notify.New(th.logger)
	require.NoError(t, err)
	th.App.notifications = notifications

	th.Store.EXPECT().GetBlock("block_gone").Return(nil, model.NewErrNotFound("block_gone"))

	require.NotPanics(t, func() {
		th.App.notifySubscriptionChanged(&model.Subscription{
			BlockID:      "block_gone",
			SubscriberID: "user_id_1",
		})
	})
}
