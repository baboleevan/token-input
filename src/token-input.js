;(function(global, factory){
	if ( typeof define === 'function' && define.amd ) {
		define(['jquery'], factory);
	}
	else {
		global.TokenInput = factory( global.jQuery );
	}
})(this, function( $ ){

	var
	DEFAULT_SETTINGS = {
		values : [],

		// 이 옵션은 반드시 해당 데이터안에서만 사용을 할 수 있도록 합니다.
		use_data_only : true,

		// 중복값 사용가능
		use_duplicate : false,

		// 결과를 몇개까지 찾을 것인가.
		max_result : 4
	},

	NULL_FUNC = function() {},

	TokenInput = function( inputs, settings ) {

		var
		runTokenInput = function() {

			var
			form = this,

			self = $(form.elems[0]),

			elem_container = $('<ul class="token-input"></ul>'),

			elem_text = $('<li class="input input-ing"></li>'),
			elem_text_input = $('<input type="text" autocomplete="off" />'),

			elem_autocomplete = $('<div class="autocomplete"></div>'),
			
			elem_token = $('<li class="input input-token"></li>'),
			elem_token_input = $('<input type="hidden" name="' + form.name +'" />'), // self.clone(),

			// use in autocomplete, timeout.
			is_ing_autocomplete = false,
			st_id = 0,

			bs_status = 0,
			
			initialize = function() {

				// create Element :)				
				self.before( elem_container );

				elem_container.append( elem_text );
				elem_container.after( elem_autocomplete );

				elem_text.append(elem_text_input);

				// 처음에 값이 있으면 집어넣어주어야 함.
				var before_values = [];
				for( var i =0, ilen = form.elems.length; i < ilen; i++) {
					if ( typeof form.elems[i].value !== "undefined" && form.elems[i].value ) {
						before_values.push( form.elems[i].value );
					}
					form.elems[i].remove();
				}
				// 기존 값이 있으면 미리 렌더를 해야합니다.
				for ( var i = 0, ilen = before_values.length; i < ilen; i++ ) {
					insertToken( before_values[i], before_values[i] );
				}

				// onChange 연결.
				form.onChange = refreshToken;

				// event bind
				elem_container.bind('click', actionFocusInput);

				elem_text_input.bind('keydown', actionKeydown);

				elem_autocomplete.on('mouseenter', 'div', actionEnterACItem);
				elem_autocomplete.on('click', 'div', actionClickACItem);

				elem_container.on('mouseenter', 'li.input-token', actionEnterToken);
				elem_container.on('click', 'li.input-token', actionClickToken);

			},
			getHoveredToken = function() {
				return elem_container.find('li.input-token.hover');
			},
			actionEnterToken = function() {
				$(this).siblings().removeClass('hover');
			},
			actionClickToken = function( e ) {
				e.preventDefault();
				$(this).addClass('hover');
				removeToken();
			},
			removeToken = function() {
				getHoveredToken().remove();
			},
			refreshToken = function() {
				var tokens = elem_container.find('li.input-token');
				tokens.each(function() {
					var
					id = $(this).find('input').val(),
					name = $(this).find('p').text(),
					is_exist = false;

					for( var i =0, ilen = settings.values.length; i < ilen; i++) {
						if ( settings.values[i].id == id ) {
							$(this).find('p').text( settings.values[i].name );
							is_exist = true;
							break;
						}
					}
					if ( !is_exist ) {
						$(this).find('p').text( id );
					}
				});
			},
			insertToken = function( name, value ) {
				var
				new_elem_token = elem_token.clone(),
				new_elem_token_input = elem_token_input.clone();

				new_elem_token.append( new_elem_token_input );
				new_elem_token.append('<p>' + name + '</p><span class="close"></span>');

				new_elem_token_input.val( value );

				elem_text.before( new_elem_token );
				elem_text_input.val('');

				hideAutocomplete();
			},
			actionKeydown = function( e ) {

				var
				self = this,
				value = $(this).val(),
				key_code = e.keyCode;
				switch( key_code ) {
					//case 9 : // TAB 
					case 13 : // ENTER
					case 108 : // NUMPAD_ENTER
					case 188 : // COMMA: 188
						e.preventDefault();
						if ( value === "" ) return;
						if ( settings.use_data_only ) {
							var ac_hover = elem_autocomplete.find('div.hover');
							if ( ac_hover.length ) {
								insertToken( ac_hover.text(), ac_hover.data('value') );							
								actionFocusInput();
							}
						}
						else {
							insertToken( elem_text_input.val(), elem_text_input.val() );
							actionFocusInput();
						}
						break;
					case 40 : // DOWN: 40,
					case 38 : // UP: 38,
						e.preventDefault();
						if ( elem_autocomplete.hasClass('active') ) {
							var
							current = elem_autocomplete.find('div.hover'),
							next;

							if ( key_code == 40 ) {
								next = current.next();
							}
							else {
								next = current.prev();
							}
							if ( next.length ) {
								current.removeClass('hover');
								next.addClass('hover');
							}
						} //nextAutocomplete.apply( self, arguments );
						break;
					case 37 : // LEFT: 37
					case 39 : // RIGHT: 39
						e.preventDefault();
						var hover_token = getHoveredToken();
						
						if ( hover_token.length !== 0 ) {
							var hover_next_token;
							if ( key_code === 37 ) {
								hover_next_token = hover_token.prev();
							}
							else {
								hover_next_token = hover_token.next();
							}
							if ( hover_next_token.length !== 0 ) {
								hover_next_token.addClass('hover').siblings().removeClass('hover');
								if ( hover_next_token.hasClass('input-token') ) {
									hover_next_token.addClass('hover');
								}
								hover_next_token.siblings().removeClass('hover');
							}
						
						}
						else if ( key_code === 37 ) {
							elem_container.find('li.input-token').eq(-1).addClass('hover');
						}
						break;
					case 27 : // ESCAPE
						e.preventDefault();
						hideAutocomplete();
						break;
					case 8 : // Backspace
						// 이때만 작동해야하고 그 이외에는 정상적으로 현재 폼에있는 글씨 지우는걸로.
						if ( value === "" ) {
							e.preventDefault();
							var hover_token = getHoveredToken();
							if ( hover_token.length === 0 ) {
								var last_token = elem_container.find('li.input-token').eq(-1);
								if( ! last_token.hasClass('hover') ) {
									last_token.addClass('hover');
								}
							}
							else {
								removeToken();
							}
							break;
						}
					default :
						// 해당 옵션을 키면 자동완성이 필요없음.
						if ( ! settings.use_data_only ) break;

						//is_run = false;
						if ( st_id && ! is_ing_autocomplete ) {
							clearTimeout( st_id );
						}

						is_ing_autocomplete = false;
						st_id = setTimeout(function() {
							is_ing_autocomplete = true;
							runAutocomplete.apply( self, arguments );
						}, 0);
						break;
				}
	//			console.log( settings.values );
			},
			runAutocomplete = function( e ) {
				var
				value = $(this).val(),
				re = new RegExp(value, "i"),
				result = [],
				current_values = [];

				if ( ! settings.use_duplicate ) {
					elem_container.find('li.input-token > input').each(function(i, item) {
						if ( typeof item.value !== "undefined" ) {
							current_values.push( item.value );							
						} 
					});

				}

				if ( value === "" ) {
					hideAutocomplete();
					return;
				}

				for( var i = settings.values.length; i--; ) {
					if ( re.test( settings.values[i]['name'] ) &&
								$.inArray( settings.values[i]['id']+"", current_values ) === -1 ) {

						result.push( settings.values[i] );
						if ( result.length >= settings.max_result ) {
							break;
						}
					}
				}

				if ( result.length ) {
					elem_autocomplete.addClass('active');
					var html = '';
					for( var i = result.length ; i--; ) {
						html += '<div data-value="'+ result[i].id+ '">' + result[i].name + '</div>';
					}
					elem_autocomplete.html( html );
					elem_autocomplete.children().eq(0).addClass('hover');

				}
				else {
					hideAutocomplete();
				}

			},
			hideAutocomplete = function() {
				elem_autocomplete.removeClass('active');
				elem_autocomplete.empty();
			},
			actionEnterACItem = function( e ) {
				$(this).addClass('hover').siblings().removeClass('hover');
			},
			actionClickACItem = function( e ) {
				e.preventDefault();
				var ac_hover = elem_autocomplete.find('div.hover');
				if ( ac_hover.length ) {
					insertToken( ac_hover.text(), ac_hover.data('value') );							
					actionFocusInput();
				}
			},
			actionFocusInput = function() {
				elem_text_input.focus();
			};

			initialize();

		},
		/**
			폼을 폼별로, 값 이름 별로 분류합니다. :)
			form_tree = [
				{
					form : <NODE_ELEMENT>,
					name : "multiple[]",
					elems : [ <Node_Element>, ... ]
				},
				{
					form : <NODE_ELEMENT>,
					name : "multiple2[]",
					elems : []
				}
			]
		 */
		token_groups = [];

		$.each( inputs, function( k, elem ) {
			var
			form = elem.form,
			name = elem.name,
			exists_in_tree = $.grep( token_groups, function( item ) {
				return item.form == form && item.name == name;
			});

			if ( exists_in_tree.length === 0 ) {
				token_groups.push({
					form : form,
					name : name,
					elems : [ elem ],
					onChange : NULL_FUNC
				});
			}
			else {
				exists_in_tree[0].elems.push( elem );
			}
		});

		$.each( token_groups, function() { runTokenInput.apply( this ) });

		return {
			add : function( items ) {
				settings.values = $.extend( settings.values, items );
				$.each( token_groups, function() { this.onChange(); });
			},
			remove : function( item ) {
				console.log("아직 미완성.");
				$.each( token_groups, function() { this.onChange(); });
			},
			clear : function() {
				settings.values = [];
				$.each( token_groups, function() { this.onChange(); });
			},
			get : function() {
				return settings.values
			}
		};
	};

	// Return in Requirejs
	return {
		run : function( opt ) {
			var
			settings = $.extend({}, DEFAULT_SETTINGS),
			target;
			if ( typeof opt === "string" ) {
				target = opt;
			}
			else {
				settings = $.extend(settings, opt);
				target = settings.target;
			}
			delete settings.target;
			return TokenInput( $( target ), settings );
		}
	};

});