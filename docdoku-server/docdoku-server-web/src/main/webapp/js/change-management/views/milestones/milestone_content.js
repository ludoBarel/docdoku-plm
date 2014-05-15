define([
    "collections/milestone_collection",
    "text!templates/milestones/milestone_content.html",
    "i18n!localization/nls/change-management-strings",
    "views/milestones/milestone_list",
    "text!common-objects/templates/buttons/delete_button.html",
    "text!common-objects/templates/buttons/ACL_button.html"
], function (
    MilestoneCollection,
    template,
    i18n,
    MilestoneListView,
    delete_button,
    ACL_button
    ) {
    var MilestoneContentView = Backbone.View.extend({

        template: Mustache.compile(template),
        events:{
            "click button.new-milestone":"newMilestone",
            "click button.delete":"deleteMilestone",
            "click button.edit-acl":"actionEditAcl"
        },

        partials:{
            delete_button: delete_button,
            ACL_button: ACL_button
        },

        initialize: function () {
            _.bindAll(this);
            this.collection = new MilestoneCollection();
        },

        render:function(){
            this.$el.html(this.template({i18n:i18n}, this.partials));

            this.bindDomElements();

            this.listView = new MilestoneListView({
                el:this.$("#milestone_table"),
                collection:this.collection
            }).render();

            this.listView.on("delete-button:display", this.changeDeleteButtonDisplay);
            this.listView.on("acl-button:display", this.changeAclButtonDisplay);

            return this;
        },

        bindDomElements:function(){
            this.deleteButton = this.$(".delete");
            this.aclButton = this.$(".edit-acl");
        },

        newMilestone:function(){
            var self = this;
            require(["views/milestones/milestone_creation"],function(MilestoneCreationView){
                var milestoneCreationView = new MilestoneCreationView({
                    collection:self.collection
                });
                $("body").append(milestoneCreationView.render().el);
                milestoneCreationView.openModal();
            });
        },

        deleteMilestone:function(){
            this.listView.deleteSelectedMilestones();
        },

        actionEditAcl: function(){
            var modelChecked = this.listView.getChecked();

            if(modelChecked){
                var self = this;
                modelChecked.fetch();
                require(["common-objects/views/security/acl_edit"],function(ACLEditView){
                    var aclEditView = new ACLEditView({
                        editMode:true,
                        acl:modelChecked.getACL()
                    });

                    aclEditView.setTitle(modelChecked.getTitle());
                    $("body").append(aclEditView.render().el);

                    aclEditView.openModal();
                    aclEditView.on("acl:update",function(){
                        var acl = aclEditView.toList();
                        modelChecked.updateACL({
                            acl: acl||{userEntries:{},groupEntries:{}},
                            success:function(){
                                modelChecked.set("acl",acl);
                                aclEditView.closeModal();
                                self.listView.redraw();
                            },
                            error:function(){
                                alert("Error on update acl");
                            }
                        });

                    });
                });
            }
        },

        changeDeleteButtonDisplay:function(state){
            if(state){
                this.deleteButton.show();
            }else{
                this.deleteButton.hide();
            }
        },

        changeAclButtonDisplay:function(state){
            if(state){
                this.aclButton.show();
            }else{
                this.aclButton.hide();
            }
        }
    });

    return MilestoneContentView;
});
