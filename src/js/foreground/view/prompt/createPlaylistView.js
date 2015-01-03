﻿define([
    'common/enum/dataSourceType',
    'foreground/view/prompt/promptContentView',
    'text!template/prompt/createPlaylist.html'
], function (DataSourceType, PromptContentView, CreatePlaylistTemplate) {
    'use strict';

    var CreatePlaylistView = PromptContentView.extend({
        id: 'createPlaylist',
        template: _.template(CreatePlaylistTemplate),
        //  TODO: Would also be nice to pull this from the DB instead, need to truncate DB column to 150.
        titleMaxLength: 150,
        
        templateHelpers: function () {
            return {
                titleMessage: chrome.i18n.getMessage('title'),
                playlistMessage: chrome.i18n.getMessage('playlist'),
                urlMessage: chrome.i18n.getMessage('url'),
                playlistCount: this.playlists.length,
                titleMaxLength: this.titleMaxLength
            };
        },
        
        ui: function () {
            return {
                title: '#' + this.id + '-title',
                titleCharacterCount: '#' + this.id + '-title-characterCount',
                dataSource: '#' + this.id + '-dataSource',
                dataSourceHint: '#' + this.id + '-dataSource-hint'
            };
        },

        events: {
            'input @ui.title': '_onInputTitle',
            'input @ui.dataSource': '_onInputDataSource'
        },
        
        playlists: null,
        dataSourceManager: null,
        
        initialize: function() {
            this.playlists = Streamus.backgroundPage.signInManager.get('signedInUser').get('playlists');
            this.dataSourceManager = Streamus.backgroundPage.dataSourceManager;
        },

        onRender: function () {
            this._setDataSourceAsUserInput();
            this._setTitleCharacterCount();
        },

        onShow: function () {
            //  Reset the value after focusing to focus without selecting.
            this.ui.title.focus().val(this.ui.title.val());
        },
        
        createPlaylist: function() {
            var dataSource = this.ui.dataSource.data('datasource');
            var trimmedTitle = this._getTrimmedTitle();

            this.playlists.addPlaylistByDataSource(trimmedTitle, dataSource);
        },
        
        _onInputDataSource: function() {
            this._debounceParseInput();
        },
        
        _onInputTitle: function () {
            this._setTitleCharacterCount();
            this._validateTitle();
        },
        
        _setTitleCharacterCount: function () {
            var trimmedTitle = this._getTrimmedTitle();
            this.ui.titleCharacterCount.text(trimmedTitle.length);
        },
        
        //  Throttle for typing support so I don't continuously validate while typing
        _debounceParseInput: _.debounce(function () {
            //  Wrap in a setTimeout to let drop event finish (no real noticeable lag but keeps things DRY easier)
            setTimeout(this._parseInput.bind(this));
        }, 100),
        
        _getTrimmedTitle: function () {
            return this.ui.title.val().trim();
        },
        
        _parseInput: function () {
            var youTubeUrl = this.ui.dataSource.val().trim();

            if (youTubeUrl !== '') {
                this._setDataSourceViaUrl(youTubeUrl);
            } else {
                this._resetInputState();
            }
        },
        
        _validateTitle: function () {
            //  When the user submits - check to see if they provided a playlist name
            var title = this._getTrimmedTitle();
            this.ui.title.toggleClass('is-invalid', title.length === 0 || title.length > this.titleMaxLength);
        },

        _setDataSourceAsUserInput: function () {
            var dataSource = this.dataSourceManager.getDataSource({
                type: DataSourceType.UserInput
            });

            this.ui.dataSource.data('datasource', dataSource);
        },
        
        _setDataSourceViaUrl: function(url) {
            //  Check validity of URL and represent validity via invalid class.
            var dataSource = this.dataSourceManager.getDataSource({
                url: url,
                parseVideo: false
            });

            dataSource.parseUrl({
                success: this._onParseUrlSuccess.bind(this, dataSource),
                error: this._setErrorState.bind(this)
            });
        },
        
        _onParseUrlSuccess: function(dataSource) {
            this.ui.dataSource.data('datasource', dataSource);
            
            dataSource.getTitle({
                success: this._onGetTitleSuccess.bind(this),
                error: this._setErrorState.bind(this)
            });
        },
        
        _onGetTitleSuccess: function(title) {
            this.ui.title.val(title);
            this._validateTitle();
            this.ui.dataSource.removeClass('is-invalid').addClass('is-valid');
            this.ui.dataSourceHint.text(chrome.i18n.getMessage('loadedPlaylist'));
        },
        
        _setErrorState: function() {
            this.ui.dataSourceHint.text(chrome.i18n.getMessage('errorLoadingUrl'));
            this.ui.dataSource.removeClass('is-valid').addClass('is-invalid');
        },
        
        _resetInputState: function() {
            this.ui.dataSource.removeClass('is-invalid is-valid').removeData('datasource');
            this.ui.dataSourceHint.text('');
            this._setDataSourceAsUserInput();
        }
    });

    return CreatePlaylistView;
});