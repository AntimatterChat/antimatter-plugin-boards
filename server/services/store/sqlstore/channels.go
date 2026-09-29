// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package sqlstore

import (
	"strings"

	sq "github.com/Masterminds/squirrel"
	amModel "github.com/mattermost/mattermost/server/public/model"
)

func (s *SQLStore) searchUserChannels(_ sq.BaseRunner, teamID, userID, query string) ([]*amModel.Channel, error) {
	channels, err := s.servicesAPI.GetChannelsForTeamForUser(teamID, userID, false)
	if err != nil {
		return nil, err
	}
	lowerQuery := strings.ToLower(query)

	result := []*amModel.Channel{}
	count := 0
	for _, channel := range channels {
		if channel.Type != amModel.ChannelTypeDirect &&
			channel.Type != amModel.ChannelTypeGroup &&
			(strings.Contains(strings.ToLower(channel.Name), lowerQuery) || strings.Contains(strings.ToLower(channel.DisplayName), lowerQuery)) {
			result = append(result, channel)
			count++
			if count >= 10 {
				break
			}
		}
	}
	return result, nil
}

func (s *SQLStore) getChannel(_ sq.BaseRunner, _, channelID string) (*amModel.Channel, error) {
	channel, err := s.servicesAPI.GetChannelByID(channelID)
	if err != nil {
		return nil, err
	}
	return channel, nil
}
