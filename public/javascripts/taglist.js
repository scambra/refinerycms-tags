/*

  Tag List for jQuery Tags Input plugin
  
  Copyright (c) 2012 Sergio Cambra
  
  Licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  sergio@entrecables.com

*/
(function( $, undefined ) {
  $.fn.tagList = function(tagsinput, options) {
    var options = $.extend({}, options);
    $(this).find('.tag').click(function(e) {
      e.preventDefault();
      if (!$(e.target).is('a')) tagsinput.addTag($(this).find('span').html());
    });
    $(this).find('.tag a').click(function(e) {
      e.preventDefault();
      var tag = $(this).closest('.tag');
      if (!options.confirm || confirm(options.confirm)) {
        $.post($(this).attr('href'), '_method=delete', function() {
          tagsinput.removeTag(tag.find('span').html());
          tag.remove();
        });
      }
    });
  };
})(jQuery);

