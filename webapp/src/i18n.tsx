// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import messages_ar from '../i18n/ar.json'
import messages_bg from '../i18n/bg.json'
import messages_bn from '../i18n/bn.json'
import messages_ca from '../i18n/ca.json'
import messages_cs from '../i18n/cs.json'
import messages_da from '../i18n/da.json'
import messages_de from '../i18n/de.json'
import messages_el from '../i18n/el.json'
import messages_es from '../i18n/es.json'
import messages_fa from '../i18n/fa.json'
import messages_fi from '../i18n/fi.json'
import messages_fil from '../i18n/fil.json'
import messages_fr from '../i18n/fr.json'
import messages_he from '../i18n/he.json'
import messages_hi from '../i18n/hi.json'
import messages_hu from '../i18n/hu.json'
import messages_id from '../i18n/id.json'
import messages_it from '../i18n/it.json'
import messages_ja from '../i18n/ja.json'
import messages_ko from '../i18n/ko.json'
import messages_ms from '../i18n/ms.json'
import messages_nbNO from '../i18n/nb-NO.json'
import messages_nl from '../i18n/nl.json'
import messages_oc from '../i18n/oc.json'
import messages_pl from '../i18n/pl.json'
import messages_pt from '../i18n/pt.json'
import messages_ptBR from '../i18n/pt-BR.json'
import messages_ro from '../i18n/ro.json'
import messages_ru from '../i18n/ru.json'
import messages_sv from '../i18n/sv.json'
import messages_ta from '../i18n/ta.json'
import messages_th from '../i18n/th.json'
import messages_tr from '../i18n/tr.json'
import messages_uk from '../i18n/uk.json'
import messages_ur from '../i18n/ur.json'
import messages_vi from '../i18n/vi.json'
import messages_zhCN from '../i18n/zh-CN.json'
import messages_zhTW from '../i18n/zh-TW.json'
import messages_en from '../i18n/en.json'

import {UserSettings} from './userSettings'

const supportedLanguages = ['ar', 'bg', 'bn', 'ca', 'cs', 'da', 'de', 'el', 'en', 'es', 'fa', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'id', 'it', 'ja', 'ko', 'ms', 'nb-no', 'nl', 'oc', 'pl', 'pt', 'pt-br', 'ro', 'ru', 'sv', 'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'zh-cn', 'zh-tw']

export function getMessages(lang: string): {[key: string]: string} {
    switch (lang) {
    case 'ar':
        return messages_ar
    case 'bg':
        return messages_bg
    case 'bn':
        return messages_bn
    case 'ca':
        return messages_ca
    case 'cs':
        return messages_cs
    case 'da':
        return messages_da
    case 'de':
        return messages_de
    case 'el':
        return messages_el
    case 'es':
        return messages_es
    case 'fa':
        return messages_fa
    case 'fi':
        return messages_fi
    case 'fil':
        return messages_fil
    case 'fr':
        return messages_fr
    case 'he':
        return messages_he
    case 'hi':
        return messages_hi
    case 'hu':
        return messages_hu
    case 'id':
        return messages_id
    case 'it':
        return messages_it
    case 'ja':
        return messages_ja
    case 'ko':
        return messages_ko
    case 'ms':
        return messages_ms
    case 'nb-no':
        return messages_nbNO
    case 'nl':
        return messages_nl
    case 'oc':
        return messages_oc
    case 'pl':
        return messages_pl
    case 'pt':
        return messages_pt
    case 'pt-br':
        return messages_ptBR
    case 'ro':
        return messages_ro
    case 'ru':
        return messages_ru
    case 'sv':
        return messages_sv
    case 'ta':
        return messages_ta
    case 'th':
        return messages_th
    case 'tr':
        return messages_tr
    case 'uk':
        return messages_uk
    case 'ur':
        return messages_ur
    case 'vi':
        return messages_vi
    case 'zh-cn':
        return messages_zhCN
    case 'zh-tw':
        return messages_zhTW
    }
    return messages_en
}
export function getCurrentLanguage(): string {
    let lang = UserSettings.language
    if (!lang) {
        if (supportedLanguages.includes(navigator.language)) {
            lang = navigator.language
        } else if (supportedLanguages.includes(navigator.language.split(/[-_]/)[0])) {
            lang = navigator.language.split(/[-_]/)[0]
        } else {
            lang = 'en'
        }
    }
    return lang
}

export function storeLanguage(lang: string): void {
    UserSettings.language = lang
}
