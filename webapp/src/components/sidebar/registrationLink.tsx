// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react'
import {useIntl} from 'react-intl'

import {sendFlashMessage} from '../flashMessages'
import {Utils} from '../../utils'
import Button from '../../widgets/buttons/button'
import {useAppDispatch, useAppSelector} from '../../store/hooks'
import {getCurrentTeam, Team, refreshCurrentTeam, regenerateSignupToken} from '../../store/teams'

import Modal from '../modal'
import {confirmDialog} from '../fusion/confirm_dialog'

import './registrationLink.scss'

type Props = {
    onClose: () => void
}

const RegistrationLink = (props: Props) => {
    const {onClose} = props
    const intl = useIntl()

    const team = useAppSelector<Team|null>(getCurrentTeam)
    const signupToken = team?.signupToken
    const dispatch = useAppDispatch()

    const [wasCopied, setWasCopied] = useState(false)

    useEffect(() => {
        /* dispatch(fetchWorkspace()) */
    }, [])

    const regenerateToken = async () => {
        const accept = await confirmDialog({
            title: intl.formatMessage({
                id: 'RegistrationLink.confirmRegenerateToken.title',
                defaultMessage: 'Regenerate the registration link?',
                description: 'Kanban: the title of the confirmation before making a new registration link.',
            }),
            message: intl.formatMessage({id: 'RegistrationLink.confirmRegenerateToken', defaultMessage: 'This will invalidate previously shared links. Continue?'}),
            confirmLabel: intl.formatMessage({
                id: 'ShareBoard.confirmRegenerateToken.confirm',
                defaultMessage: 'Regenerate',
                description: 'Kanban: the button that confirms making a new public link to a board.',
            }),
            cancelLabel: intl.formatMessage({id: 'ConfirmationDialog.cancel-action', defaultMessage: 'Cancel'}),
            danger: true,
        })
        if (accept) {
            await dispatch(regenerateSignupToken())
            await dispatch(refreshCurrentTeam())
            setWasCopied(false)

            const description = intl.formatMessage({id: 'RegistrationLink.tokenRegenerated', defaultMessage: 'Registration link regenerated'})
            sendFlashMessage({content: description, severity: 'low'})
        }
    }

    const registrationUrl = `${Utils.getBaseURL(true).replace(/\/$/, '')}/register?t=${signupToken}`

    return (
        <Modal
            position='bottom-right'
            onClose={onClose}
        >
            <div className='RegistrationLink'>
                {signupToken && <>
                    <div className='row'>
                        {intl.formatMessage({id: 'RegistrationLink.description', defaultMessage: 'Share this link for others to create accounts:'})}
                    </div>
                    <div className='row'>
                        <a
                            className='shareUrl'
                            href={registrationUrl}
                            target='_blank'
                            rel='noreferrer'
                        >
                            {registrationUrl}
                        </a>
                        <Button
                            filled={true}
                            size='small'
                            onClick={() => {
                                Utils.copyTextToClipboard(registrationUrl)
                                setWasCopied(true)
                            }}
                        >
                            {wasCopied ? intl.formatMessage({id: 'RegistrationLink.copiedLink', defaultMessage: 'Copied!'}) : intl.formatMessage({id: 'RegistrationLink.copyLink', defaultMessage: 'Copy link'})}
                        </Button>
                    </div>
                    <div className='row'>
                        <Button
                            onClick={regenerateToken}
                            emphasis='secondary'
                            size='small'
                        >
                            {intl.formatMessage({id: 'RegistrationLink.regenerateToken', defaultMessage: 'Regenerate token'})}
                        </Button>
                    </div>
                </>}
            </div>
        </Modal>
    )
}

export default React.memo(RegistrationLink)
