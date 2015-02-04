$(function(){
    _.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g,
        evaluate: /\{\%(.+?)\%\}/g
    };

    var nobueno = [
        'S.A',
        'SA',
        'Sa',
        'sA',
        's.a',
        'S.A.',
        's.A.',
        's.a.',
        'S.a.',
        'C.V',
        'c.v',
        'C.v',
        'c.V',
        'C.V.',
        'C.v.',
        'c.v.',
        'c.V.',
        'CV',
        'Cv',
        'cV',
        'de',
        'DE',
        'DEL',
        'del',
        'Del',
        'DeL',
        'DEl',
        'deL',
        'dEL',
        'dEl',
    ];
    var regex = XRegExp("[^\\s\\p{Latin}`\\p{InCombiningDiacriticalMarks}]+", "g");

    var $sidebar = $('#main-sidebar');
    var $sidebarList = $sidebar.find('ul');
    var colors = ['black', 'yellow', 'green', 'blue', 'orange', 'red', 'pink', 'purple', 'teal'];
    var Category = Backbone.Model.extend({
        defaults: {
            active: false,
            hasSubcategory: false,
            keywords: [],
            name: 'New category',
            pluralized: '',
            priority: 0/*,
            subCategories: []*/
        },
        urlRoot: '/categories',
        idAttribute: 'objectId'
    });
    var Categories = Backbone.Collection.extend({
        url: '/categories', model: Category,
        parse: function(response){
            var categories = [];
            if(!_.isEmpty(response) && !_.isEmpty(response.results)){
                categories = response.results;
            }

            return categories;
        }
    });
    var CategoryItem = Backbone.View.extend({
        className: 'item category-item',
        tagName: 'a',
        attributes: {
            href: '#'
        },
        events: {
            'click': 'open'
        },
        template: _.template('{% if(data.active) { %}<i class="icon cloud left"></i>{% } %}{% if(data.primary) { %}<i class="icon bookmark left"></i>{% } %}{% if(data.hasSubcategory) { %}<i class="icon caret right"></i> {% } %}{% if(data.pluralized) { %}{{ (data.pluralized) }}{% } else { %}{{ (data.displayName) }}{% } %}'),
        initialize: function(options){
            if(!options || !options.model){
                this.model = new Category();
            }

            this.listenTo(this.model, 'change:name', this.render, this);
            this.listenTo(this.model, 'change:selected', this.toggle, this);

            this.render();
            return this;
        },
        render: function(){
            this.$el.html(this.template({data: this.model.toJSON()}));
        },
        open: function(e){
            if(e && e.preventDefault){
                e.preventDefault();
            }
            this.model.set('selected', true);
            Backbone.trigger('category:show', this.model.toJSON());
        },
        toggle: function(){
            if(this.model.get('selected')){
                this.$el.addClass('active');
            }else{
                this.$el.removeClass('active');
            }
        }
    })
    var CategoriesView = Backbone.View.extend({
        el: '#main-sidebar',
        views: [],
        events: {
            'click .category-item': 'clearSelected'
        },
        initialize: function(options){
            if(!options || !options.collection){
                this.collection = new Categories();
            }

            this.listenTo(this.collection, 'reset', this.addAll, this);
            this.listenTo(this.collection, 'add', this.addOne, this);

            Backbone.on('category:show', this.select, this);
        },
        addAll: function(){
            this.collection.each(this.addOne, this);

            return this;
        },
        addOne: function(model){
            var view = new CategoryItem({model: model});

            this.views.push(view);
            this.$el.append(view.$el);

            return this;
        },
        select: function(current){
            var selected = this.collection.filter(function(s){return s.get('selected');});

            _.each(selected, function(s){
                if(!_.isEqual(s.id, current.objectId)){
                    s.set('selected', false);
                }
            });
        }
    });
    var CategoryView = Backbone.View.extend({
        el: '#main-container',
        dom: {},
        keywordTemplate: _.template('<div class="ui label {{ color }}">{{ label }} <i class="delete icon"></i></div>'),
        events: {
            'change': 'onChange',
            'click .label .delete.icon': 'deleteLabel',
            'click #category-update-button': 'submit' 
        },
        initialize: function(options){
            if(!options || !options.model){
                this.model = new Category();
            }

            this.listenTo(this.model, 'request', this.showDimmer, this);
            this.listenTo(this.model, 'sync', this.onSuccess, this);
            this.listenTo(this.model, 'error', this.onError, this);

            Backbone.on('category:show', this.update, this);

            this.render();
        },
        render: function(){
            this.undelegateEvents();
            //Fields
            this.dom.label = this.$el.find('#category-labels');
            this.dom.isActive = this.$el.find('#category-is-active-checkbox');
            this.dom.isPrimary = this.$el.find('#category-is-primary-checkbox');
            this.dom.name = this.$el.find('#name');
            this.dom.pluralName = this.$el.find('#plural-name');
            this.dom.priority = this.$el.find('#category-priority');
            this.dom.keywords = this.$el.find('#category-keywords');
            this.dom.keywordsArea = this.$el.find('#category-keywords-area');
            //Components
            this.dom.priorityDropdown = this.$el.find('#category-priority-dropdown');
            this.dom.priorityDropdown.dropdown();
            this.dom.isActive.checkbox();
            this.dom.isPrimary.checkbox();

            this.dom.button = this.$el.find('#category-update-button');

            this.dom.form = this.$el.find('form');

            this.dom.form.form({
                'category-name': {
                    identifier: 'category-name',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Name can not be empty'
                        },
                        { 
                            type: 'length[2]',
                            prompt: 'Name must be at least three characters length'
                        }
                    ]
                },
                'category-plural-name': {
                    identifier: 'category-name',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Plural name can not be empty'
                        },
                        { 
                            type: 'length[2]',
                            prompt: 'Plural name must be at least three characters length'
                        }
                    ]
                },
                'category-keywords-area': {
                    identifier: 'category-keywords-area',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Keywords can not be empty'
                        },
                        {
                            type: 'length[3]',
                            prompt: 'Keywords must be at least three characters length'
                        }
                    ]
                }
            });

            return this;
        },
        update: function(data){
            if(!_.isEmpty(data)){
                this.snapshot = data;

                this.undelegateEvents();

                this.$el.find('#main-segment').removeClass('disabled');
                this.model.set(data);

                this.dom.name.val(data.name);
                this.dom.pluralName.val(data.pluralized);

                if(data.active){
                    this.dom.isActive.checkbox('check');
                }else{
                    this.dom.isActive.checkbox('uncheck');
                }

                if(data.primary){
                    this.dom.isPrimary.checkbox('check');
                }else{
                    this.dom.isPrimary.checkbox('uncheck');
                }

                if(data.priority){
                    this.dom.priorityDropdown.dropdown('set value', data.priority);
                }else{
                    this.dom.priorityDropdown.dropdown('restore defaults');
                }

                var keywordsText = data.keywords.sort().join(',');
                var keywordsView = [];

                _.each(data.keywords, _.bind(function(k){
                    var color = colors[_.random(0, colors.length-1)];
                    keywordsView.push(this.keywordTemplate({label: k, color: color}));
                }, this));

                this.dom.keywords.html(keywordsView.join(' '));
                this.dom.keywordsArea.val(keywordsText);

                this.delegateEvents();

            }else{
                this.$el.find('#main-segment').addClass('disabled');
            }
        },
        deleteLabel: function(e){
            var $target = $(e.currentTarget).parents('.label');

            $target.remove();
            
            var $tags = this.dom.keywords.find('.label');
            var tags = _.map($tags, function(t){return $.trim($(t).text());});

            this.dom.keywordsArea.val(tags.join(',')).trigger('change');
        },
        showDimmer: function(){
            this.$el.dimmer('show');
        },
        hideDimmer: function(){
            this.$el.dimmer('hide');
        },
        onChange: function(){
            this.model.set('name', $.trim(this.dom.name.val()));
            this.model.set('pluralized', $.trim(this.dom.pluralName.val()));
            this.model.set('active', this.dom.isActive.checkbox('is checked'));
            this.model.set('primary', this.dom.isPrimary.checkbox('is checked'));
            this.model.set('priority', this.dom.priorityDropdown.dropdown('get value')*1);
            this.model.set('keywords', this.dom.keywordsArea.val().split(',').sort());

            if(_.isEqual(this.snapshot, this.model.toJSON())){
                this.dom.button.addClass('disabled');
            }else{
                this.dom.button.removeClass('disabled');
            }
        },
        onError: function(){
            this.hideDimmer();
            console.log('error', arguments);
        },
        onSuccess: function(){
            this.hideDimmer();
            console.log('ok', arguments);
        },
        submit: function(){
            if(_.isEqual(this.snapshot, this.model.toJSON())){
                alert('Nothing to change');
            }else{
                this.model.save();
            }
        }
    });
    var Modal = Backbone.View.extend({
        className: 'ui small modal',
        template: _.template($('#modal-template').html()),
        dom: {},
        events: {
            'submit': 'submit'
        },
        initialize: function(){
            this.model = new Category();

            this.listenTo(this.model, 'sync', this.onSave, this);
            this.listenTo(this.model, 'error', this.onError, this);
        },
        render: function(){
            this.$el.html(this.template());
            this.$el.modal({
                closable: false,
                onApprove: _.bind(function(){
                    this.dom.form.submit();
                    return false;
                }, this),
                onDeny: _.bind(function(){
                    console.log('deny closing category creation dialog');
                }, this)
            });
            this.dom.checkbox = this.$el.find('#new-is-primary').checkbox();
            this.dom.form = this.$el.find('form');
            this.dom.errorList = this.$el.find('.error.message ul');

            this.dom.form.form({
                'new-name': {
                    identifier: 'new-name',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Category name can not be empty'
                        },
                        {
                            type: 'length[3]',
                            prompt: 'Category name must be at least three characters length'
                        }
                    ]
                },
                'new-name-plural': {
                    identifier: 'new-name-plural',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Pluralized category name can not be empty'
                        },
                        {
                            type: 'length[3]',
                            prompt: 'Pluralized category name must be at least three characters length'
                        }
                    ]
                },
                'new-is-primary': {
                    identifier: 'new-is-primary',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Please select if this category is primary or not'
                        }
                    ]
                },
                'new-is-active': {
                    identifier: 'new-is-primary',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Please select if this category is active or not'
                        }
                    ]
                },
                'new-keywords': {
                    identifier: 'new-keywords',
                    rules: [
                        {
                            type: 'empty',
                            prompt: 'Keywords can not be empty'
                        },
                        {
                            type: 'length[3]',
                            prompt: 'Keywords must be at least three characters length'
                        }
                    ]
                }
            });

            return this;
        },
        submit: function(e){
            if(e && e.preventDefault){
                e.preventDefault();
            }

            var isValid = this.dom.form.form('validate form');
            var values, isPrimary, name, keywords, isActive;

            if(isValid){
                this.dom.form.removeClass('error');
                this.dom.errorList.empty();
                this.$el.dimmer('show');

                values = this.dom.form.form('get values');
                isPrimary = !!(values['new-is-primary']*1);
                isActive = !!(values['new-is-active']*1);
                name = values['new-name'].toLowerCase();
                keywords = values['new-keywords'].split(',');
                keywords = _.map(keywords, function(v){
                    v = $.trim(v);
                    if(v.length > 2){return v;}
                });

                this.model.set({
                    name: name,
                    displayName: $.trim(_.escape(values['new-name'])),
                    keywords: _.uniq(keywords),
                    primary: isPrimary,
                    active: isActive,
                    pluralized: $.trim(_.escape(values['new-name-plural']))
                });

                this.model.save();
            }
        },
        onSave: function(){
            this.$el.dimmer('hide');
            this.dom.form.form('clear');

            categories.add(this.model.toJSON());
            this.model.clear();

            alert('Category has been saved');
        },
        onError: function(mode, xhr){
            var data = JSON.parse(xhr.responseText);

            alert('ERROR: ' + data.error || 'An unknown error has occurred, please try again or contact customer support.');

            this.$el.dimmer('hide');
        },
        show: function(){
            if(!this.$el.parent().length){
                this.$el.appendTo('body');
            }
            this.dom.form.form('clear');
            this.$el.modal('show');
        },
        hide: function(){
            this.$el.detach();
            this.$el.modal('hide');
        }
    });
    var SubMenu = Backbone.View.extend({
        el: '#sub-menu',
        modal: null,
        venuesModal: null,
        events: {
            'click .add': 'add',
            'click .add-sub': 'addSubcategory',
            'click .import-venues': 'importVenues'
        },
        add: function(){
            if(!this.modal){
                this.modal = new Modal().render();
            }

            this.modal.show();
        },
        addSubcategory: function(){
            if(!this.modal){
                this.modal = new Modal().render();
            }

            this.modal.show();
        },
        importVenues: function(){
            if(!this.venuesModal){
                this.venuesModal = new ImportModal().render();
            }

            window.venuesModal = this.venuesModal;

            this.venuesModal.show();
        }
    });
    //Create view and collection
    var categories = new Categories();
    var categoriesView = new CategoriesView({collection: categories});
    var categoryView = new CategoryView({model: new Category()});
    var subMenu = new SubMenu();

    //Import feature objects
    var VenueModel = Backbone.Model.extend({
        defaults: {
            name: 'Default name',
            keywords: [],
            road_name: '',
            phone_number: '000-000-0000',
            social_reference: '',
            latitud: '',
            longitud: ''
        },
        getAddress: function(){
            var address = '';
            var n = this.get('exterior_number');
            var castedN = parseInt(n, 10);

            if(!_.isEmpty(this.get('road_type'))){
                address += this.escape('road_type') + ' ' + this.escape('road_name');
            }

            if(!_.isEmpty(this.get('road_type_1'))){
                address += ' entre ' + this.escape('road_type_1') + ' ' + this.escape('road_name_1');
            }

            if(!_.isEmpty(this.get('road_type_2'))){
                address += ' y ' + this.escape('road_type_2') + ' ' + this.escape('road_name_2');
            }

            if(n){
                if(!_.isNaN(castedN) && _.isNumber(castedN)){
                    address += ' #' + _.escape(n);
                }else if(!_.isString(n)){
                    if(n === 'SN' || n === 'sn'){
                        address += ' Sin numero';
                    }else {
                        address += ' #' + _.escape(n);
                    }
                }
            }

            return address;
        },
        getVecinity: function(){
            var address = '';

            if(this.get('settling_type') && this.get('settling_name')){
                address += this.get('settling_type') + ' ' + this.get('settling_name');
            }else if(this.get('settling_name')){
                address += 'Colonia ' + this.get('settling_name');
            }

            return address.toLowerCase();
        },
        getCity: function(){
            var city = '';
            var location = this.get('locality');
            var municipality = this.get('municipality');
            var state = this.get('federal_entity');

            if(location === municipality){
                city += location + ', ' + state;
            }else {
                city += location + ', ' + municipality + ', ' + state;
            }

            if(this.get('postal_code')){
                city += ' C.P ' + this.escape('postal_code');
            }

            return city;
        },
        getData: function(){
            var data = this.toJSON();
            return {
                name: XRegExp.replace(data.name, regex, ""),
                keywords: data.keywords.split(','),
                latitud: parseFloat(data.latitud, 10),
                longitud: parseFloat(data.longitud, 10),
                address: this.getAddress(),
                vecinity: this.getVecinity(),
                city: this.getCity(),
                phone_number: data.phone_number,
                social_reference: data.social_reference,
                id: this.id
            };
        }
    });
    var VenueColection = Backbone.Collection.extend({
        model: VenueModel
    });
    var venueTemplate = '<td class="one wide">{{ data.id }}</td>' + 
    '<td class="three wide">{{ data.name }}</td>' + 
    '<td class="three wide">{% data.keywords.forEach(function(k){ %} <div class="ui tiny label">{{k}}</div> {% }); %}</td>' + 
    '<td class="three wide"><div>{{ data.address }}, {{data.vecinity}}, {{data.city}}</div></td>' +
    '<td class="two wide">{{ data.phone_number }}</td>' + 
    '<td class="three wide">{{ data.social_reference }}</td>' + 
    '<td class="one wide"><a href="http://www.jound.mx/#position/{{ data.latitud }},{{data.longitud}}" class="ui circular icon compact red button" target="_blank"><i class="icon marker"></i></a></td>';

    var VenueItem = Backbone.View.extend({
        tagName: 'tr',
        template: _.template(venueTemplate),
        model: VenueModel,
        initialize: function(options){
            if(!options && !options.model){
                this.model = new VenueModel();
            }

            return this.render();
        },
        render: function(){
            this.$el.html(this.template({data: this.model.getData()}));

            return this;
        },
        close: function(){
            this.model = null;
            this.$el.html('');
            this.$el.remove();
            this.unbind();
        }
    });
    var FileModel = Backbone.Model.extend({
        defaults: {
            fileName: '',
            count: 0
        }
    });
    var Venues = Backbone.View.extend({
        className: 'ui',
        template: _.template($('#venue-table-template').html()),
        views: [],
        fragments: null,
        events: {
            'change select': 'onCategoryChange'
        },
        initialize: function(options){
            this.fragments = document.createDocumentFragment();

            if(options){
                if(!options.collection){
                    this.collection = new VenueColection();
                }

                if(options.items && !_.isEmpty(options.items) && _.isArray(options.items)){
                    this.collection.reset(options.items);
                }

                if(options.categories){
                    this.categories = options.categories
                }else{
                    throw new Error('Venues importer requires a categories array to work.');
                }

                if(options.file){
                    this.file = options.file;
                }
            }

            this.listenTo(this.collection, 'reset', this.addAll, this);
            this.listenTo(this.collection, 'sync', this.onSync, this);
            this.listenTo(this.collection, 'request', this.$el.dimmer, this);

            return this.render();
        },
        render: function(){
            var data = _.extend(this.collection.toJSON(), {categories: this.categories, file: this.file});
            this.$el.html(this.template({data: data }));

            this.dom = {
                table: this.$el.find('table'),
                body: this.$el.find('tbody'),
                header: this.$el.find('thead'),
                footer: this.$el.find('tfoot'),
                dropdown: this.$el.find('.ui.dropdown')
            }

            this.dom.dropdown.dropdown();

            if(this.collection.length){
                this.addAll();
            }

            return this;
        },
        close: function(){
            _.each(this.views, function(v){v.close();v=null;});
            this.views = [];
            this.fragments = null;
            this.unbind()
            this.stopListening();
            this.$el.remove();
        },
        addAll: function(){
            this.collection.each(this.addOne, this);

            this.dom.body.append(this.fragments);
        },
        addOne: function(model){
            var view = new VenueItem({model: model});
            this.views.push(view);
            this.fragments.appendChild(view.$el[0]);
        }
    });
    var ImportModel = Backbone.Model.extend({
        url: '/categories/import',
        defaults: {
            venues: []
        },
    });
    var ImportModal = Backbone.View.extend({
        className: 'ui fullscreen modal',
        template: _.template($('#import-modal-template').html()),
        dom: {},
        events: {
            'submit': 'submit',
            'change [type=file]': 'onFileChange'
        },
        views: [],
        initialize: function(){
            this.categories = categories.toJSON();
            this.model = new ImportModel();

            return this;
        },
        render: function(){
            this.$el.html(this.template());
            this.$el.modal({
                closable: false,
                onApprove: _.bind(function(){
                    this.save();
                    return false;
                }, this),
                onDeny: _.bind(function(){
                    if(this.views.length){
                        if(confirm('By closing this modal you will lost all the import data in it.')){
                            this.close();
                        }else{
                            return false;
                        }
                   }
                }, this)
            });

            //his.dom.checkbox = this.$el.find('#new-is-primary').checkbox();
            this.dom.form = this.$el.find('form');
            this.dom.errorList = this.$el.find('.error.message ul');
            this.dom.button = this.$el.find('#venue-import-button');
            this.dom.file = this.dom.form.find('[type=file]');
            this.dom.venues = this.$el.find('#venues-container');
            this.dom.formContainer = this.$el.find('#venues-import-form-container');
            this.dom.formContainer.removeAttr('hidden');

            return this;
        },
        save: function(){
            var venues = _.map(this.views, function(v){return {category: v.dom.dropdown.dropdown('get value'), venues: v.collection.toJSON()}});
            var missing = _.find(venues, function(v){return _.isEmpty(v.category);});

            if(missing){
                alert('Please review your data, looks like a set of venues is missing the category option. Feel free to contact customer support for further assistance.');
            }else{
                this.$el.dimmer('show');
                this.model.set('venues', venues).save();
            }
        },
        submit: function(e){
            if(e && e.preventDefault){
                e.preventDefault();
            }

            this.dom.form.removeClass('error');
            this.dom.errorList.empty();
            this.$el.dimmer('show');
        },
        onSave: function(){
            console.log('save', arguments);
            this.$el.dimmer('hide');

            alert('Venues have been saved');

            this.close();
        },
        onError: function(mode, xhr){
            var data = JSON.parse(xhr.responseText);

            alert('ERROR: ' + data.error || 'An unknown error has occurred, please try again or contact customer support.');

            this.$el.dimmer('hide');
        },
        show: function(){
            if(!this.$el.parent().length){
                this.$el.appendTo('body');
            }

            this.dom.form.trigger('reset');
            this.dom.button.addClass('disabled');
            this.dom.file.removeClass('disabled');
            this.dom.formContainer.removeAttr('hidden');

            this.listenTo(this.model, 'sync', this.onSave, this);
            this.listenTo(this.model, 'error', this.onError, this);

            this.$el.modal('show');
        },
        close: function(){
            this.$el.modal('hide');
            _.each(this.views, function(v){v.close();v=null;});
            this.views = [];
            this.stopListening();
            this.unbind();
            this.model.clear();
        },
        onFileChange: function(){
            this.dom.form.addClass('loading');

            var elements = document.createDocumentFragment();
            var categories = _.map(this.categories, function(c){return {id: c.objectId, name: c.pluralized};});
            this.dom.file.parse({
                config: {
                    header: true,
                    dynamicTyping: true,
                    preview: 0,
                    encoding: "UTF-8",
                    skipEmptyLines: true,
                    complete: _.bind(function(results, file){
                        var view = new Venues({items: results.data, categories: categories, file: file.name});
                        this.views.push(view);
                        elements.appendChild(view.$el[0]);
                    }, this)
                },
                complete: _.bind(function(){
                    this.dom.form.removeClass('loading');
                    this.dom.formContainer.prop('hidden', this);
                    this.dom.venues.removeAttr('hidden');
                    this.dom.button.removeClass('disabled');

                    this.dom.venues.append(elements);
                }, this)
            });
        }
    });

    $sidebar.dimmer('show');
    //Fetch categories
    categories.fetch({
        success: _.bind(function(){
            $sidebar.dimmer('hide');

            if(this.length){
                var first = this.at(0);
                first.set('selected', true);
                categoryView.update(first.toJSON());
            }
        }, categories),
        error: function(){
            $sidebar.dimmer('hide');
        }
    });
});