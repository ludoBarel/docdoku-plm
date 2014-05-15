/*global APP_VIEW*/
define([
    "common-objects/common/singleton_decorator",
    "common-objects/views/base",
    "views/task_document_list",
    "text!templates/task_nav.html"
], function (
    singletonDecorator,
    BaseView,
    TaskDocumentListView,
    template
    ) {
    var TaskNavView = BaseView.extend({
        template: Mustache.compile(template),
        el: "#task-nav",

        initialize: function () {
            BaseView.prototype.initialize.apply(this, arguments);
            this.render();
        },

        setActive: function () {
            if(APP_VIEW.$documentManagementMenu){
                APP_VIEW.$documentManagementMenu.find(".active").removeClass("active");
            }
            this.$el.find(".nav-list-entry").first().addClass("active");
        },

        showContent: function (filter) {
            this.setActive();
            this.addSubView(
                new TaskDocumentListView({filter:filter})
            ).render();
        }
    });

    TaskNavView = singletonDecorator(TaskNavView);
    return TaskNavView;
});
