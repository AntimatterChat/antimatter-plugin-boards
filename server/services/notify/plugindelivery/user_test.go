// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package plugindelivery

import (
	"reflect"
	"testing"

	"github.com/antimatterchat/antimatter-plugin-boards/server/model"

	am_model "github.com/mattermost/mattermost/server/public/model"
)

var (
	defTeamID = am_model.NewId()

	user1 = &am_model.User{
		Id:       am_model.NewId(),
		Username: "dlauder",
	}
	user2 = &am_model.User{
		Id:       am_model.NewId(),
		Username: "steve.mqueen",
	}
	user3 = &am_model.User{
		Id:       am_model.NewId(),
		Username: "bart_",
	}
	user4 = &am_model.User{
		Id:       am_model.NewId(),
		Username: "missing_",
	}
	user5 = &am_model.User{
		Id:       am_model.NewId(),
		Username: "wrong_team",
	}

	mockUsers = map[string]*am_model.User{
		"dlauder":      user1,
		"steve.mqueen": user2,
		"bart_":        user3,
		"wrong_team":   user5,
	}
)

func Test_userByUsername(t *testing.T) {
	servicesAPI := newServicesAPIMock(mockUsers)
	delivery := New("bot_id", "server_root", servicesAPI)

	tests := []struct {
		name    string
		uname   string
		teamID  string
		want    *am_model.User
		wantErr bool
	}{
		{name: "user1", uname: user1.Username, want: user1, wantErr: false},
		{name: "user1 with period", uname: user1.Username + ".", want: user1, wantErr: false},
		{name: "user1 with period plus more", uname: user1.Username + ". ", want: user1, wantErr: false},
		{name: "user2 with periods", uname: user2.Username + "...", want: user2, wantErr: false},
		{name: "user2 with underscore", uname: user2.Username + "_", want: user2, wantErr: false},
		{name: "user2 with hyphen plus more", uname: user2.Username + "- ", want: user2, wantErr: false},
		{name: "user2 with hyphen plus all", uname: user2.Username + ".-_ ", want: user2, wantErr: false},
		{name: "user3 with underscore", uname: user3.Username + "_", want: user3, wantErr: false},
		{name: "user4 missing", uname: user4.Username, want: nil, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := delivery.UserByUsername(tt.uname)
			if (err != nil) != tt.wantErr {
				t.Errorf("userByUsername() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("userByUsername()\ngot:\n%v\nwant:\n%v\n", got, tt.want)
			}
		})
	}
}

type servicesAPIMock struct {
	users map[string]*am_model.User
}

func newServicesAPIMock(users map[string]*am_model.User) servicesAPIMock {
	return servicesAPIMock{
		users: users,
	}
}

func (m servicesAPIMock) GetUserByUsername(name string) (*am_model.User, error) {
	user, ok := m.users[name]
	if !ok {
		return nil, model.NewErrNotFound(name)
	}
	return user, nil
}

func (m servicesAPIMock) GetDirectChannel(userID1, userID2 string) (*am_model.Channel, error) {
	return nil, nil
}

func (m servicesAPIMock) GetDirectChannelOrCreate(userID1, userID2 string) (*am_model.Channel, error) {
	return nil, nil
}

func (m servicesAPIMock) CreatePost(post *am_model.Post) (*am_model.Post, error) {
	return post, nil
}

func (m servicesAPIMock) GetUserByID(userID string) (*am_model.User, error) {
	for _, user := range m.users {
		if user.Id == userID {
			return user, nil
		}
	}
	return nil, model.NewErrNotFound(userID)
}

func (m servicesAPIMock) GetTeamMember(teamID string, userID string) (*am_model.TeamMember, error) {
	user, err := m.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	if teamID != defTeamID {
		return nil, model.NewErrNotFound(teamID)
	}

	member := &am_model.TeamMember{
		UserId: user.Id,
		TeamId: teamID,
	}
	return member, nil
}

func (m servicesAPIMock) GetChannelByID(channelID string) (*am_model.Channel, error) {
	return nil, model.NewErrNotFound(channelID)
}

func (m servicesAPIMock) GetChannelMember(channelID string, userID string) (*am_model.ChannelMember, error) {
	return nil, model.NewErrNotFound(userID)
}

func (m servicesAPIMock) CreateMember(teamID string, userID string) (*am_model.TeamMember, error) {
	member := &am_model.TeamMember{
		UserId: userID,
		TeamId: teamID,
	}
	return member, nil
}
