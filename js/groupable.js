(function($) {

    $.entwine("ss", function($) {

        /**
         * Groupable works on top og Orderable, overrides some methods by having a more specific entwine selector
         */
        $(".ss-gridfield-orderable.ss-gridfield-groupable tbody").entwine({

            // Role of the group field, eg 'Area' (descriptive)
            GroupRole: 'Group',

            // Available groups
            AvailableGroups: null,

            // The field on items that holds the group dropdown
            ItemGroupField: null,

            // Name/heading for 'no group' / 0
            NoGroupName: '(none)',

            //onmatch: function() {
            onadd: function() {
                var self = this; // this & self are already a jQuery obj

                this._super(); // execute GridFieldOrderableRows::onadd

                // if not on SiteTree, return (e.g. BlockManager)
                if(! self.getGridField().attr('data-groupable-groups')){ return; }

                this.setItemGroupField( self.getGridField().data('groupable-itemfield') );

                var groupRole = self.getGridField().data('groupable-role');
                if(groupRole){ this.setGroupRole( groupRole ); }

                var noGroupName = self.getGridField().data('groupable-unassigned');
                if(noGroupName){ this.setNoGroupName( noGroupName ); }

                var groups = self.getGridField().data('groupable-groups'); // valid json, already parsed by jQ
                if(Object.keys( groups ).length){
                    groups.none = this.getNoGroupName();
                } else {
                    return; // don't add headers if we have no groups defined
                }
                this.setAvailableGroups(groups);

                // get initial ID order to check if we need to update after sorting
                var initialIdOrder = self.getGridField().getItems()
                    .map(function() { return $(this).data("id"); }).get();

                // insert blockAreas boundaries
                var groupBoundElements = [];
                $.each(groups, function(groupKey, groupName) {
                    //console.log(index); console.log(value);
                    //var colSpan = $('tr',self).first().find('td').length;
                    var colSpan = self.siblings('thead').find('tr.ss-gridfield-title-header th').length;
                    // ▾ / ▼ / ↓
                    var boundEl = $('<tr class="groupable-bound"><td>↓</td>'
                        +'<td colspan="'+(colSpan-1)+'">'+ self.getGroupRole() +': <strong>'
                        +(groupName || self.getNoGroupName())+'</strong></td></tr>');
                    boundEl.data('groupKey', groupKey);
                    groupBoundElements[groupKey] = boundEl;
                    $(self).append(boundEl); //before(bound);
                });
                // and put blocks in order below boundaries
                jQuery.fn.reverseOrder = [].reverse; // small reverse plugin
                self.getGridField().getItems().reverseOrder().each(function(){
                    var myGroup = $('.col-'+ self.getItemGroupField() +' select',this).val() || 'none';
                    $(this).insertAfter( groupBoundElements[myGroup] );
                });
                // hide the blockarea column
                $('.col-action_SetOrderBlockArea, .col-BlockArea').hide();

                // get ID order again to check if we need to update now we've sorted primarily by area
                var sortedIdOrder = self.getGridField().getItems()
                    .map(function() { return $(this).data("id"); }).get();

                // ifchanged, we should call this.sortable.update() (from orderablegridfield)
                if(JSON.stringify(initialIdOrder)!=JSON.stringify(sortedIdOrder)){ // test same array & order
                    this.sortable("option", "update")();
                }

                // remove the auto sortable callback (called by hand after setting the correct area first)
        //                this.setOriginalSortCallback(this.sortable("option", "update"));
                this.sortable({ update: null });

            },

            onsortstop: function( event, ui ) {

                // set correct area on row/item areaselect
                var group = ui.item.prevAll('.groupable-bound').first().data('groupKey');
                $('.col-'+ this.getItemGroupField() +' select',ui.item).val(group);

                // save group on object/rel

                // duplicated from GridFieldOrderableRows.onadd.update:
                var grid = this.getGridField();
                var data = grid.getItems().map(function() {
                    return {
                        name: "order[]",
                        value: $(this).data("id")
                    };
                }).get();

                // insert area assignment data as well
                data.push({
                    name: 'groupable_item_id',
                    value: ui.item.data("id")
                });
                data.push({
                    name: 'groupable_group_key',
                    value: group
                });

                // area-assignment forwards the request to gridfieldextensions::reorder server side
                grid.reload({
                    //url: grid.data("url-reorder"),
                    url: grid.data("url-group-assignment"),
                    data: data
                });

                // don't call original from JS to prevent double reload, instead request gets forwarded via PHP
                //this.getOriginalSortCallback()();
            }

        });

    });
})(jQuery);