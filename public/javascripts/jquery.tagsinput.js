/*
 * jQuery UI Autocomplete 1.8.17
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Autocomplete
 *
 * Depends:
 *  jquery.ui.core.js
 *  jquery.ui.widget.js
 *  jquery.ui.position.js
 */
(function( $, undefined ) {

// used to prevent race conditions with remote data sources
var requestIndex = 0;

$.widget( "ui.autocomplete", {
  options: {
    appendTo: "body",
    autoFocus: false,
    delay: 300,
    minLength: 1,
    position: {
      my: "left top",
      at: "left bottom",
      collision: "none"
    },
    source: null
  },

  pending: 0,

  _create: function() {
    var self = this,
      doc = this.element[ 0 ].ownerDocument,
      suppressKeyPress;

    this.element
      .addClass( "ui-autocomplete-input" )
      .attr( "autocomplete", "off" )
      // TODO verify these actually work as intended
      .attr({
        role: "textbox",
        "aria-autocomplete": "list",
        "aria-haspopup": "true"
      })
      .bind( "keydown.autocomplete", function( event ) {
        if ( self.options.disabled || self.element.propAttr( "readOnly" ) ) {
          return;
        }

        suppressKeyPress = false;
        var keyCode = $.ui.keyCode;
        switch( event.keyCode ) {
        case keyCode.PAGE_UP:
          self._move( "previousPage", event );
          break;
        case keyCode.PAGE_DOWN:
          self._move( "nextPage", event );
          break;
        case keyCode.UP:
          self._move( "previous", event );
          // prevent moving cursor to beginning of text field in some browsers
          event.preventDefault();
          break;
        case keyCode.DOWN:
          self._move( "next", event );
          // prevent moving cursor to end of text field in some browsers
          event.preventDefault();
          break;
        case keyCode.ENTER:
        case keyCode.NUMPAD_ENTER:
          // when menu is open and has focus
          if ( self.menu.active ) {
            // #6055 - Opera still allows the keypress to occur
            // which causes forms to submit
            suppressKeyPress = true;
            event.preventDefault();
          }
          //passthrough - ENTER and TAB both select the current element
        case keyCode.TAB:
          if ( !self.menu.active ) {
            return;
          }
          self.menu.select( event );
          break;
        case keyCode.ESCAPE:
          self.element.val( self.term );
          self.close( event );
          break;
        default:
          // keypress is triggered before the input value is changed
          clearTimeout( self.searching );
          self.searching = setTimeout(function() {
            // only search if the value has changed
            if ( self.term != self.element.val() ) {
              self.selectedItem = null;
              self.search( null, event );
            }
          }, self.options.delay );
          break;
        }
      })
      .bind( "keypress.autocomplete", function( event ) {
        if ( suppressKeyPress ) {
          suppressKeyPress = false;
          event.preventDefault();
        }
      })
      .bind( "focus.autocomplete", function() {
        if ( self.options.disabled ) {
          return;
        }

        self.selectedItem = null;
        self.previous = self.element.val();
      })
      .bind( "blur.autocomplete", function( event ) {
        if ( self.options.disabled ) {
          return;
        }

        clearTimeout( self.searching );
        // clicks on the menu (or a button to trigger a search) will cause a blur event
        self.closing = setTimeout(function() {
          self.close( event );
          self._change( event );
        }, 150 );
      });
    this._initSource();
    this.response = function() {
      return self._response.apply( self, arguments );
    };
    this.menu = $( "<ul></ul>" )
      .addClass( "ui-autocomplete" )
      .appendTo( $( this.options.appendTo || "body", doc )[0] )
      // prevent the close-on-blur in case of a "slow" click on the menu (long mousedown)
      .mousedown(function( event ) {
        // clicking on the scrollbar causes focus to shift to the body
        // but we can't detect a mouseup or a click immediately afterward
        // so we have to track the next mousedown and close the menu if
        // the user clicks somewhere outside of the autocomplete
        var menuElement = self.menu.element[ 0 ];
        if ( !$( event.target ).closest( ".ui-menu-item" ).length ) {
          setTimeout(function() {
            $( document ).one( 'mousedown', function( event ) {
              if ( event.target !== self.element[ 0 ] &&
                event.target !== menuElement &&
                !$.ui.contains( menuElement, event.target ) ) {
                self.close();
              }
            });
          }, 1 );
        }

        // use another timeout to make sure the blur-event-handler on the input was already triggered
        setTimeout(function() {
          clearTimeout( self.closing );
        }, 13);
      })
      .menu({
        focus: function( event, ui ) {
          var item = ui.item.data( "item.autocomplete" );
          if ( false !== self._trigger( "focus", event, { item: item } ) ) {
            // use value to match what will end up in the input, if it was a key event
            if ( /^key/.test(event.originalEvent.type) ) {
              self.element.val( item.value );
            }
          }
        },
        selected: function( event, ui ) {
          var item = ui.item.data( "item.autocomplete" ),
            previous = self.previous;

          // only trigger when focus was lost (click on menu)
          if ( self.element[0] !== doc.activeElement ) {
            self.element.focus();
            self.previous = previous;
            // #6109 - IE triggers two focus events and the second
            // is asynchronous, so we need to reset the previous
            // term synchronously and asynchronously :-(
            setTimeout(function() {
              self.previous = previous;
              self.selectedItem = item;
            }, 1);
          }

          if ( false !== self._trigger( "select", event, { item: item } ) ) {
            self.element.val( item.value );
          }
          // reset the term after the select event
          // this allows custom select handling to work properly
          self.term = self.element.val();

          self.close( event );
          self.selectedItem = item;
        },
        blur: function( event, ui ) {
          // don't set the value of the text field if it's already correct
          // this prevents moving the cursor unnecessarily
          if ( self.menu.element.is(":visible") &&
            ( self.element.val() !== self.term ) ) {
            self.element.val( self.term );
          }
        }
      })
      .zIndex( this.element.zIndex() + 1 )
      // workaround for jQuery bug #5781 http://dev.jquery.com/ticket/5781
      .css({ top: 0, left: 0 })
      .hide()
      .data( "menu" );
    if ( $.fn.bgiframe ) {
       this.menu.element.bgiframe();
    }
    // turning off autocomplete prevents the browser from remembering the
    // value when navigating through history, so we re-enable autocomplete
    // if the page is unloaded before the widget is destroyed. #7790
    self.beforeunloadHandler = function() {
      self.element.removeAttr( "autocomplete" );
    };
    $( window ).bind( "beforeunload", self.beforeunloadHandler );
  },

  destroy: function() {
    this.element
      .removeClass( "ui-autocomplete-input" )
      .removeAttr( "autocomplete" )
      .removeAttr( "role" )
      .removeAttr( "aria-autocomplete" )
      .removeAttr( "aria-haspopup" );
    this.menu.element.remove();
    $( window ).unbind( "beforeunload", this.beforeunloadHandler );
    $.Widget.prototype.destroy.call( this );
  },

  _setOption: function( key, value ) {
    $.Widget.prototype._setOption.apply( this, arguments );
    if ( key === "source" ) {
      this._initSource();
    }
    if ( key === "appendTo" ) {
      this.menu.element.appendTo( $( value || "body", this.element[0].ownerDocument )[0] )
    }
    if ( key === "disabled" && value && this.xhr ) {
      this.xhr.abort();
    }
  },

  _initSource: function() {
    var self = this,
      array,
      url;
    if ( $.isArray(this.options.source) ) {
      array = this.options.source;
      this.source = function( request, response ) {
        response( $.ui.autocomplete.filter(array, request.term) );
      };
    } else if ( typeof this.options.source === "string" ) {
      url = this.options.source;
      this.source = function( request, response ) {
        if ( self.xhr ) {
          self.xhr.abort();
        }
        self.xhr = $.ajax({
          url: url,
          data: request,
          dataType: "json",
          autocompleteRequest: ++requestIndex,
          success: function( data, status ) {
            if ( this.autocompleteRequest === requestIndex ) {
              response( data );
            }
          },
          error: function() {
            if ( this.autocompleteRequest === requestIndex ) {
              response( [] );
            }
          }
        });
      };
    } else {
      this.source = this.options.source;
    }
  },

  search: function( value, event ) {
    value = value != null ? value : this.element.val();

    // always save the actual value, not the one passed as an argument
    this.term = this.element.val();

    if ( value.length < this.options.minLength ) {
      return this.close( event );
    }

    clearTimeout( this.closing );
    if ( this._trigger( "search", event ) === false ) {
      return;
    }

    return this._search( value );
  },

  _search: function( value ) {
    this.pending++;
    this.element.addClass( "ui-autocomplete-loading" );

    this.source( { term: value }, this.response );
  },

  _response: function( content ) {
    if ( !this.options.disabled && content && content.length ) {
      content = this._normalize( content );
      this._suggest( content );
      this._trigger( "open" );
    } else {
      this.close();
    }
    this.pending--;
    if ( !this.pending ) {
      this.element.removeClass( "ui-autocomplete-loading" );
    }
  },

  close: function( event ) {
    clearTimeout( this.closing );
    if ( this.menu.element.is(":visible") ) {
      this.menu.element.hide();
      this.menu.deactivate();
      this._trigger( "close", event );
    }
  },
  
  _change: function( event ) {
    if ( this.previous !== this.element.val() ) {
      this._trigger( "change", event, { item: this.selectedItem } );
    }
  },

  _normalize: function( items ) {
    // assume all items have the right format when the first item is complete
    if ( items.length && items[0].label && items[0].value ) {
      return items;
    }
    return $.map( items, function(item) {
      if ( typeof item === "string" ) {
        return {
          label: item,
          value: item
        };
      }
      return $.extend({
        label: item.label || item.value,
        value: item.value || item.label
      }, item );
    });
  },

  _suggest: function( items ) {
    var ul = this.menu.element
      .empty()
      .zIndex( this.element.zIndex() + 1 );
    this._renderMenu( ul, items );
    // TODO refresh should check if the active item is still in the dom, removing the need for a manual deactivate
    this.menu.deactivate();
    this.menu.refresh();

    // size and position menu
    ul.show();
    this._resizeMenu();
    ul.position( $.extend({
      of: this.element
    }, this.options.position ));

    if ( this.options.autoFocus ) {
      this.menu.next( new $.Event("mouseover") );
    }
  },

  _resizeMenu: function() {
    var ul = this.menu.element;
    ul.outerWidth( Math.max(
      // Firefox wraps long text (possibly a rounding bug)
      // so we add 1px to avoid the wrapping (#7513)
      ul.width( "" ).outerWidth() + 1,
      this.element.outerWidth()
    ) );
  },

  _renderMenu: function( ul, items ) {
    var self = this;
    $.each( items, function( index, item ) {
      self._renderItem( ul, item );
    });
  },

  _renderItem: function( ul, item) {
    return $( "<li></li>" )
      .data( "item.autocomplete", item )
      .append( $( "<a></a>" ).text( item.label ) )
      .appendTo( ul );
  },

  _move: function( direction, event ) {
    if ( !this.menu.element.is(":visible") ) {
      this.search( null, event );
      return;
    }
    if ( this.menu.first() && /^previous/.test(direction) ||
        this.menu.last() && /^next/.test(direction) ) {
      this.element.val( this.term );
      this.menu.deactivate();
      return;
    }
    this.menu[ direction ]( event );
  },

  widget: function() {
    return this.menu.element;
  }
});

$.extend( $.ui.autocomplete, {
  escapeRegex: function( value ) {
    return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  },
  filter: function(array, term) {
    var matcher = new RegExp( $.ui.autocomplete.escapeRegex(term), "i" );
    return $.grep( array, function(value) {
      return matcher.test( value.label || value.value || value );
    });
  }
});

}( jQuery ));

/*
 * jQuery UI Menu (not officially released)
 * 
 * This widget isn't yet finished and the API is subject to change. We plan to finish
 * it for the next release. You're welcome to give it a try anyway and give us feedback,
 * as long as you're okay with migrating your code later on. We can help with that, too.
 *
 * Copyright 2010, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Menu
 *
 * Depends:
 *  jquery.ui.core.js
 *  jquery.ui.widget.js
 */
(function($) {

$.widget("ui.menu", {
  _create: function() {
    var self = this;
    this.element
      .addClass("ui-menu ui-widget ui-widget-content ui-corner-all")
      .attr({
        role: "listbox",
        "aria-activedescendant": "ui-active-menuitem"
      })
      .click(function( event ) {
        if ( !$( event.target ).closest( ".ui-menu-item a" ).length ) {
          return;
        }
        // temporary
        event.preventDefault();
        self.select( event );
      });
    this.refresh();
  },
  
  refresh: function() {
    var self = this;

    // don't refresh list items that are already adapted
    var items = this.element.children("li:not(.ui-menu-item):has(a)")
      .addClass("ui-menu-item")
      .attr("role", "menuitem");
    
    items.children("a")
      .addClass("ui-corner-all")
      .attr("tabindex", -1)
      // mouseenter doesn't work with event delegation
      .mouseenter(function( event ) {
        self.activate( event, $(this).parent() );
      })
      .mouseleave(function() {
        self.deactivate();
      });
  },

  activate: function( event, item ) {
    this.deactivate();
    if (this.hasScroll()) {
      var offset = item.offset().top - this.element.offset().top,
        scroll = this.element.scrollTop(),
        elementHeight = this.element.height();
      if (offset < 0) {
        this.element.scrollTop( scroll + offset);
      } else if (offset >= elementHeight) {
        this.element.scrollTop( scroll + offset - elementHeight + item.height());
      }
    }
    this.active = item.eq(0)
      .children("a")
        .addClass("ui-state-hover")
        .attr("id", "ui-active-menuitem")
      .end();
    this._trigger("focus", event, { item: item });
  },

  deactivate: function() {
    if (!this.active) { return; }

    this.active.children("a")
      .removeClass("ui-state-hover")
      .removeAttr("id");
    this._trigger("blur");
    this.active = null;
  },

  next: function(event) {
    this.move("next", ".ui-menu-item:first", event);
  },

  previous: function(event) {
    this.move("prev", ".ui-menu-item:last", event);
  },

  first: function() {
    return this.active && !this.active.prevAll(".ui-menu-item").length;
  },

  last: function() {
    return this.active && !this.active.nextAll(".ui-menu-item").length;
  },

  move: function(direction, edge, event) {
    if (!this.active) {
      this.activate(event, this.element.children(edge));
      return;
    }
    var next = this.active[direction + "All"](".ui-menu-item").eq(0);
    if (next.length) {
      this.activate(event, next);
    } else {
      this.activate(event, this.element.children(edge));
    }
  },

  // TODO merge with previousPage
  nextPage: function(event) {
    if (this.hasScroll()) {
      // TODO merge with no-scroll-else
      if (!this.active || this.last()) {
        this.activate(event, this.element.children(".ui-menu-item:first"));
        return;
      }
      var base = this.active.offset().top,
        height = this.element.height(),
        result = this.element.children(".ui-menu-item").filter(function() {
          var close = $(this).offset().top - base - height + $(this).height();
          // TODO improve approximation
          return close < 10 && close > -10;
        });

      // TODO try to catch this earlier when scrollTop indicates the last page anyway
      if (!result.length) {
        result = this.element.children(".ui-menu-item:last");
      }
      this.activate(event, result);
    } else {
      this.activate(event, this.element.children(".ui-menu-item")
        .filter(!this.active || this.last() ? ":first" : ":last"));
    }
  },

  // TODO merge with nextPage
  previousPage: function(event) {
    if (this.hasScroll()) {
      // TODO merge with no-scroll-else
      if (!this.active || this.first()) {
        this.activate(event, this.element.children(".ui-menu-item:last"));
        return;
      }

      var base = this.active.offset().top,
        height = this.element.height();
        result = this.element.children(".ui-menu-item").filter(function() {
          var close = $(this).offset().top - base + height - $(this).height();
          // TODO improve approximation
          return close < 10 && close > -10;
        });

      // TODO try to catch this earlier when scrollTop indicates the last page anyway
      if (!result.length) {
        result = this.element.children(".ui-menu-item:first");
      }
      this.activate(event, result);
    } else {
      this.activate(event, this.element.children(".ui-menu-item")
        .filter(!this.active || this.first() ? ":last" : ":first"));
    }
  },

  hasScroll: function() {
    return this.element.height() < this.element[ $.fn.prop ? "prop" : "attr" ]("scrollHeight");
  },

  select: function( event ) {
    this._trigger("selected", event, { item: this.active });
  }
});

}(jQuery));

/*

	jQuery Tags Input Plugin 1.3.3
	
	Copyright (c) 2011 XOXCO, Inc
	
	Documentation for this plugin lives here:
	http://xoxco.com/clickable/jquery-tags-input
	
	Licensed under the MIT license:
	http://www.opensource.org/licenses/mit-license.php

	ben@xoxco.com

*/

(function($) {

	var delimiter = new Array();
	var tags_callbacks = new Array();
	$.fn.doAutosize = function(o){
	    var minWidth = $(this).data('minwidth'),
	        maxWidth = $(this).data('maxwidth'),
	        val = '',
	        input = $(this),
	        testSubject = $('#'+$(this).data('tester_id'));
	
	    if (val === (val = input.val())) {return;}
	
	    // Enter new content into testSubject
	    var escaped = val.replace(/&/g, '&amp;').replace(/\s/g,' ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	    testSubject.html(escaped);
	    // Calculate new width + whether to change
	    var testerWidth = testSubject.width(),
	        newWidth = (testerWidth + o.comfortZone) >= minWidth ? testerWidth + o.comfortZone : minWidth,
	        currentWidth = input.width(),
	        isValidWidthChange = (newWidth < currentWidth && newWidth >= minWidth)
	                             || (newWidth > minWidth && newWidth < maxWidth);
	
	    // Animate width
	    if (isValidWidthChange) {
	        input.width(newWidth);
	    }


  };
  $.fn.resetAutosize = function(options){
    // alert(JSON.stringify(options));
    var minWidth =  $(this).data('minwidth') || options.minInputWidth || $(this).width(),
        maxWidth = $(this).data('maxwidth') || options.maxInputWidth || ($(this).closest('.tagsinput').width() - options.inputPadding),
        val = '',
        input = $(this),
        testSubject = $('<tester/>').css({
            position: 'absolute',
            top: -9999,
            left: -9999,
            width: 'auto',
            fontSize: input.css('fontSize'),
            fontFamily: input.css('fontFamily'),
            fontWeight: input.css('fontWeight'),
            letterSpacing: input.css('letterSpacing'),
            whiteSpace: 'nowrap'
        }),
        testerId = $(this).attr('id')+'_autosize_tester';
    if(! $('#'+testerId).length > 0){
      testSubject.attr('id', testerId);
      testSubject.appendTo('body');
    }

    input.data('minwidth', minWidth);
    input.data('maxwidth', maxWidth);
    input.data('tester_id', testerId);
    input.css('width', minWidth);
  };
  
	$.fn.addTag = function(value,options) {
			options = jQuery.extend({focus:false,callback:true},options);
			this.each(function() { 
				var id = $(this).attr('id');

				var tagslist = $(this).val().split(delimiter[id]);
				if (tagslist[0] == '') { 
					tagslist = new Array();
				}

				value = jQuery.trim(value);
		
				if (options.unique) {
					var skipTag = $(tagslist).tagExist(value);
					if(skipTag == true) {
					    //Marks fake input as not_valid to let styling it
    				    $('#'+id+'_tag').addClass('not_valid');
    				}
				} else {
					var skipTag = false; 
				}
				
				if (value !='' && skipTag != true) { 
                    $('<span>').addClass('tag').append(
                        $('<span>').text(value).append('&nbsp;&nbsp;'),
                        $('<a>', {
                            href  : '#',
                            title : 'Removing tag',
                            text  : 'x'
                        }).click(function () {
                            return $('#' + id).removeTag(escape(value));
                        })
                    ).insertBefore('#' + id + '_addTag');

					tagslist.push(value);
				
					$('#'+id+'_tag').val('');
					if (options.focus) {
						$('#'+id+'_tag').focus();
					} else {		
						$('#'+id+'_tag').blur();
					}
					
					$.fn.tagsInput.updateTagsField(this,tagslist);
					
					if (options.callback && tags_callbacks[id] && tags_callbacks[id]['onAddTag']) {
						var f = tags_callbacks[id]['onAddTag'];
						f.call(this, value);
					}
					if(tags_callbacks[id] && tags_callbacks[id]['onChange'])
					{
						var i = tagslist.length;
						var f = tags_callbacks[id]['onChange'];
						f.call(this, $(this), tagslist[i-1]);
					}					
				}
		
			});		
			
			return false;
		};
		
	$.fn.removeTag = function(value) { 
			value = unescape(value);
			this.each(function() { 
				var id = $(this).attr('id');
	
				var old = $(this).val().split(delimiter[id]);
					
				$('#'+id+'_tagsinput .tag').remove();
				str = '';
				for (i=0; i< old.length; i++) { 
					if (old[i]!=value) { 
						str = str + delimiter[id] +old[i];
					}
				}
				
				$.fn.tagsInput.importTags(this,str);

				if (tags_callbacks[id] && tags_callbacks[id]['onRemoveTag']) {
					var f = tags_callbacks[id]['onRemoveTag'];
					f.call(this, value);
				}
			});
					
			return false;
		};
	
	$.fn.tagExist = function(val) {
		return (jQuery.inArray(val, $(this)) >= 0); //true when tag exists, false when not
	};
	
	// clear all existing tags and import new ones from a string
	$.fn.importTags = function(str) {
                id = $(this).attr('id');
		$('#'+id+'_tagsinput .tag').remove();
		$.fn.tagsInput.importTags(this,str);
	}
		
	$.fn.tagsInput = function(options) { 
    var settings = jQuery.extend({
      interactive:true,
      defaultText:'add a tag',
      minChars:0,
      width:'300px',
      height:'100px',
      autocomplete: {selectFirst: false },
      'hide':true,
      'delimiter':',',
      'unique':true,
      removeWithBackspace:true,
      placeholderColor:'#666666',
      autosize: true,
      comfortZone: 20,
      inputPadding: 6*2
    },options);

		this.each(function() { 
			if (settings.hide) { 
				$(this).hide();				
			}
				
			var id = $(this).attr('id')
			
			var data = jQuery.extend({
				pid:id,
				real_input: '#'+id,
				holder: '#'+id+'_tagsinput',
				input_wrapper: '#'+id+'_addTag',
				fake_input: '#'+id+'_tag'
			},settings);
	
			delimiter[id] = data.delimiter;
			
			if (settings.onAddTag || settings.onRemoveTag || settings.onChange) {
				tags_callbacks[id] = new Array();
				tags_callbacks[id]['onAddTag'] = settings.onAddTag;
				tags_callbacks[id]['onRemoveTag'] = settings.onRemoveTag;
				tags_callbacks[id]['onChange'] = settings.onChange;
			}
	
			var markup = '<div id="'+id+'_tagsinput" class="tagsinput"><div id="'+id+'_addTag">';
			
			if (settings.interactive) {
				markup = markup + '<input id="'+id+'_tag" value="" data-default="'+settings.defaultText+'" />';
			}
			
			markup = markup + '</div><div class="tags_clear"></div></div>';
			
			$(markup).insertAfter(this);

			$(data.holder).css('width',settings.width);
			$(data.holder).css('height',settings.height);
	
			if ($(data.real_input).val()!='') { 
				$.fn.tagsInput.importTags($(data.real_input),$(data.real_input).val());
			}		
			if (settings.interactive) { 
				$(data.fake_input).val($(data.fake_input).attr('data-default'));
				$(data.fake_input).css('color',settings.placeholderColor);
		        $(data.fake_input).resetAutosize(settings);
		
				$(data.holder).bind('click',data,function(event) {
					$(event.data.fake_input).focus();
				});
			
				$(data.fake_input).bind('focus',data,function(event) {
					if ($(event.data.fake_input).val()==$(event.data.fake_input).attr('data-default')) { 
						$(event.data.fake_input).val('');
					}
					$(event.data.fake_input).css('color','#000000');		
				});
						
				if (settings.autocomplete_url != undefined) {
					autocomplete_options = {source: settings.autocomplete_url};
					for (attrname in settings.autocomplete) { 
						autocomplete_options[attrname] = settings.autocomplete[attrname]; 
					}
				
					if (jQuery.Autocompleter !== undefined) {
						$(data.fake_input).autocomplete(settings.autocomplete_url, settings.autocomplete);
						$(data.fake_input).bind('result',data,function(event,data,formatted) {
							if (data) {
								$('#'+id).addTag(data[0] + "",{focus:true,unique:(settings.unique)});
							}
					  	});
					} else if (jQuery.ui.autocomplete !== undefined) {
						$(data.fake_input).autocomplete(autocomplete_options);
						$(data.fake_input).bind('autocompleteselect',data,function(event,ui) {
							$(event.data.real_input).addTag(ui.item.value,{focus:true,unique:(settings.unique)});
							return false;
						});
					}
				
					
				} else {
						// if a user tabs out of the field, create a new tag
						// this is only available if autocomplete is not used.
						$(data.fake_input).bind('blur',data,function(event) { 
							var d = $(this).attr('data-default');
							if ($(event.data.fake_input).val()!='' && $(event.data.fake_input).val()!=d) { 
								if( (event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)) )
									$(event.data.real_input).addTag($(event.data.fake_input).val(),{focus:true,unique:(settings.unique)});
							} else {
								$(event.data.fake_input).val($(event.data.fake_input).attr('data-default'));
								$(event.data.fake_input).css('color',settings.placeholderColor);
							}
							return false;
						});
				
				}
				// if user types a comma, create a new tag
				$(data.fake_input).bind('keypress',data,function(event) {
					if (event.which==event.data.delimiter.charCodeAt(0) || event.which==13 ) {
					    event.preventDefault();
						if( (event.data.minChars <= $(event.data.fake_input).val().length) && (!event.data.maxChars || (event.data.maxChars >= $(event.data.fake_input).val().length)) )
							$(event.data.real_input).addTag($(event.data.fake_input).val(),{focus:true,unique:(settings.unique)});
					  	$(event.data.fake_input).resetAutosize(settings);
						return false;
					} else if (event.data.autosize) {
			            $(event.data.fake_input).doAutosize(settings);
            
          			}
				});
				//Delete last tag on backspace
				data.removeWithBackspace && $(data.fake_input).bind('keydown', function(event)
				{
					if(event.keyCode == 8 && $(this).val() == '')
					{
						 event.preventDefault();
						 var last_tag = $(this).closest('.tagsinput').find('.tag:last').text();
						 var id = $(this).attr('id').replace(/_tag$/, '');
						 last_tag = last_tag.replace(/[\s]+x$/, '');
						 $('#' + id).removeTag(escape(last_tag));
						 $(this).trigger('focus');
					}
				});
				$(data.fake_input).blur();
				
				//Removes the not_valid class when user changes the value of the fake input
				if(data.unique) {
				    $(data.fake_input).keydown(function(event){
				        if(event.keyCode == 8 || String.fromCharCode(event.which).match(/\w+|[áéíóúÁÉÍÓÚñÑ,/]+/)) {
				            $(this).removeClass('not_valid');
				        }
				    });
				}
			} // if settings.interactive
			return false;
		});
			
		return this;
	
	};
	
	$.fn.tagsInput.updateTagsField = function(obj,tagslist) { 
		var id = $(obj).attr('id');
		$(obj).val(tagslist.join(delimiter[id]));
	};
	
	$.fn.tagsInput.importTags = function(obj,val) {			
		$(obj).val('');
		var id = $(obj).attr('id');
		var tags = val.split(delimiter[id]);
		for (i=0; i<tags.length; i++) { 
			$(obj).addTag(tags[i],{focus:false,callback:false});
		}
		if(tags_callbacks[id] && tags_callbacks[id]['onChange'])
		{
			var f = tags_callbacks[id]['onChange'];
			f.call(obj, obj, tags[i]);
		}
	};

})(jQuery);
