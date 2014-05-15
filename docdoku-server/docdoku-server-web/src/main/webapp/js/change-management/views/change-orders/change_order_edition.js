define([
        "text!templates/change-orders/change_order_edition.html",
        "i18n!localization/nls/change-management-strings",
        "models/change_order",
        "common-objects/collections/users",
        "collections/milestone_collection"
    ],
    function (template, i18n, ChangeOrderModel ,UserList, MilestoneList) {

    var ChangeOrderEditionView = Backbone.View.extend({
        events: {
            "submit #order_edition_form" : "onSubmitForm",
            "hidden #order_edition_modal": "onHidden"
        },

        template: Mustache.compile(template),

        initialize: function() {
            this.tagsToRemove = [];
            this._subViews = [];
            this.model.fetch();
            _.bindAll(this);
            this.$el.on("remove",this.removeSubviews);                                                                  // Remove cascade
        },

        removeSubviews: function(){
            _(this._subViews).invoke("remove");
        },

        render: function() {
            this.removeSubviews();
            this.editMode = this.model.isWritable();
            this.$el.html(this.template({i18n: i18n, model: this.model}));
            this.bindDomElements();
            new UserList().fetch({success: this.fillUserList});
            new MilestoneList().fetch({success: this.fillMilestoneList});
            this.fillPriorityList();
            this.fillCategoryList();
            this.initValue();
            this.tagManagement();
            this.linkManagement();
            return this;
        },

        fillMilestoneList:function(list){
            var self = this ;
            if(list){
                list.each(function(milestone){
                    self.$inputOrderMilestone.append("<option value='"+milestone.get("id")+"'"+">"+milestone.get("title")+"</option>");
                });
            }
            this.$inputOrderMilestone.val(this.model.getMilestoneId());
        },
        fillUserList:function(list){
            var self = this ;
            list.each(function(user){
                self.$inputOrderAssignee.append("<option value='"+user.get("login")+"'"+">"+user.get("name")+"</option>");
            });
            this.$inputOrderAssignee.val(this.model.getAssignee());
        },
        fillPriorityList:function(){
            for(var priority in this.model.priorities){
                this.$inputOrderPriority.append("<option value='"+priority+"'"+">"+priority+"</option>")
            }
            this.$inputOrderPriority.val(this.model.getPriority());
        },
        fillCategoryList:function(){
            for(var category in this.model.categories){
                this.$inputOrderCategory.append("<option value='"+category+"'"+">"+category+"</option>")
            }
            this.$inputOrderCategory.val(this.model.getCategory());
        },

        tagManagement: function(){
            var that = this;

            if(this.model.attributes.tags.length){
                require(["common-objects/models/tag",
                         "common-objects/views/tags/tag"],
                function(Tag, TagView){
                    var $tagsZone = this.$(".master-tags-list");
                    _.each(that.model.attributes.tags, function (tagLabel) {
                        var tagView;
                        var tagViewParams = {
                            model: new Tag({id: tagLabel, label: tagLabel}),
                            isAdded: that.editMode,
                            clicked: function () {
                                that.tagsToRemove.push(tagLabel);
                                tagView.$el.remove();
                            }
                        };

                        tagView = new TagView(tagViewParams).render();
                        that._subViews.push(tagView);

                        $tagsZone.append(tagView.el);
                    });
                });
            }
        },

        linkManagement: function(){
            var that = this;
            var affectedDocuments = this.model.getAffectedDocuments();
            var $affectedDocumentsLinkZone = this.$("#documents-affected-links");
            require(["common-objects/views/linked/linked_documents","common-objects/collections/linked/linked_document_collection"],
            function(LinkedDocumentsView,LinkedDocumentCollection){
                that._affectedDocumentsCollection = new LinkedDocumentCollection(affectedDocuments);
                that._linkedDocumentsView = new LinkedDocumentsView({
                    editMode: that.editMode,
                    collection:that._affectedDocumentsCollection
                }).render();

                that._subViews.push(that._linkedDocumentsView);
                $affectedDocumentsLinkZone.html(that._linkedDocumentsView.el);
            });
            var affectedParts = this.model.getAffectedParts();
            var $affectedPartsLinkZone = this.$("#parts-affected-links");
            require(["common-objects/views/linked/linked_parts","common-objects/collections/linked/linked_part_collection"],
            function(LinkedPartsView,LinkedPartCollection){
                that._affectedPartsCollection = new LinkedPartCollection(affectedParts);
                that._linkedPartsView = new LinkedPartsView({
                    editMode: that.editMode,
                    collection:that._affectedPartsCollection
                }).render();

                that._subViews.push(that._linkedPartsView);
                $affectedPartsLinkZone.html(that._linkedPartsView.el);
            });
            var affectedRequests = this.model.getAddressedChangeRequests();
            var $affectedRequestsLinkZone = this.$("#requests-affected-links");
            require(["common-objects/views/linked/linked_requests","common-objects/collections/linked/linked_change_item_collection"],
                function(LinkedRequestsView,LinkedChangeItemCollection){
                    that._affectedRequestsCollection = new LinkedChangeItemCollection(affectedRequests);
                    var linkedRequestsView = new LinkedRequestsView({
                        editMode: that.editMode,
                        collection:that._affectedRequestsCollection,
                        linkedPartsView: that._linkedPartsView,
                        linkedDocumentsView: that._linkedDocumentsView
                    }).render();

                    that._subViews.push(linkedRequestsView);
                    $affectedRequestsLinkZone.html(linkedRequestsView.el);
                });
        },

        bindDomElements:function(){
            this.$modal = this.$('#order_edition_modal');
            this.$inputOrderName = this.$('#inputOrderName');
            this.$inputOrderDescription = this.$('#inputOrderDescription');
            this.$inputOrderMilestone = this.$('#inputOrderMilestone');
            this.$inputOrderPriority = this.$('#inputOrderPriority');
            this.$inputOrderAssignee = this.$('#inputOrderAssignee');
            this.$inputOrderCategory = this.$('#inputOrderCategory');
        },

        initValue: function () {
            this.$inputOrderName.val(this.model.getName());
            this.$inputOrderDescription.val(this.model.getDescription());
        },

        onSubmitForm: function(e) {
            var data ={
                description: this.$inputOrderDescription.val(),
                author:APP_CONFIG.login,
                assignee:this.$inputOrderAssignee.val(),
                priority:this.$inputOrderPriority.val(),
                category:this.$inputOrderCategory.val(),
                milestoneId:parseInt(this.$inputOrderMilestone.val())
            };

            this.model.save(data,{
                success: this.closeModal,
                error: this.error,
                wait: true
            });

            this.deleteClickedTags();                                                                                   // Delete tags if needed
            this.updateAffectedDocuments();
            this.updateAffectedParts();
            this.updateAffectedRequests();

            e.preventDefault();
            e.stopPropagation();
            return false ;
        },

        onError: function(model, error){
            alert(i18n.EDITION_ERROR + " : " + error.responseText);
        },

        openModal: function() {
            this.$modal.modal('show');
        },

        closeModal: function() {
            this.$modal.modal('hide');
        },

        onHidden: function() {
            this.remove();
        },

        deleteClickedTags: function(){
            if(this.tagsToRemove.length){
                var that = this ;
                this.model.removeTags(this.tagsToRemove, function(){
                    if(that.model.collection.parent) {
                        if(_.contains(that.tagsToRemove, that.model.collection.parent.id)){
                            that.model.collection.remove(that.model);
                        }
                    }
                });
            }
        },

        updateAffectedDocuments: function () {
            this.model.saveAffectedDocuments(this._affectedDocumentsCollection);
        },

        updateAffectedParts: function () {
            this.model.saveAffectedParts(this._affectedPartsCollection);
        },

        updateAffectedRequests: function () {
            this.model.saveAffectedRequests(this._affectedRequestsCollection);
        }
    });

    return ChangeOrderEditionView;
});