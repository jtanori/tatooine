var Image = require('parse-image');
var mandrill = require('mandrill-api/mandrill');
var Mandrill = new mandrill.Mandrill('mxhWmtMyRCF56l7Ax6ksSA');

Parse.Cloud.define('addImageToVenue', function(req, res){
    var id = req.params.id;
    var url = req.params.url;
    var imageId = req.params.imageId;
    var venue, img;

    var Img = Parse.Object.extend('File');
    var Venue = Parse.Object.extend('Location');

    if(id && url && imageId){
        venue = new Venue();
        venue.id = id;

        img = new Img();
        img.id = imageId;

        venue
            .fetch()
            .then(function(){
                var relation = venue.relation('imagesRelation');

                relation.add(img);

                venue
                    .addUnique('images', url)
                    .save(null, {useMasterKey: true})
                    .then(function(){
                        res.success('Image added to venue');
                    })
                    .fail(function(v, error){
                        console.log('Error adding image to venue', v, error);
                        res.error('Image not added to venue: ' + error.message);
                    });
            })
            .fail(function(v, error){
                console.log('error fetching venue for image adding', v, error);
                res.error('An error has occurred while getting the object: ' + error.message);
            })
    }else{
        res.error('Invalid parameters');
    }
});

Parse.Cloud.beforeSave('File', function(request, response){
    var f = request.object;
    if(!f.get('file')){
        return;
    }

    if(f.existed()){
        return;
    }

    //Create recipient image
    var cropped = new Image();

    Parse.Cloud.useMasterKey();
    //Looks very messy but it is just a long data buffer
    Parse.Cloud.httpRequest({
        url: f.get('file').url()
    }).then(function(response){
        return cropped.setData(response.buffer);
    }).then(function(image){
        console.log("Image is " + image.width() + "x" + image.height() + ".");
        var w = image.width();
        var h = image.height();
        var defaults = {width: 500, height: 500};

        if(w >= 500 && h <= 500){
            return image.crop({width: h, height: h});
        }else if( h>= 500 && w <= 500){
            return image.crop({width: w, height: w});
        }else if(w > 500 && h > 500){
            return image.crop(defaults);
        }else{
            return image;
        }
    }).then(function(image){
        console.log("Image is cropped " + image.width() + "x" + image.height() + ".");
        //Save croped file
        return image.data();
    }).then(function(buffer){
        return (new Parse.File('cropped.jpg', {base64: buffer.toString('base64')})).save();
    }).then(function(c){
        f.set('cropped', c);

        return cropped;
    }).then(function(image){
        return image.scale({ width: 100, height: 100 });
    }).then(function(image){
        return image.data();
    }).then(function(buffer){
        return (new Parse.File('thumbnail.jpg', {base64: buffer.toString('base64')})).save();
    }).then(function(resized){
        f.set('thumbnail', resized);

        console.log('Thumbnail added to the File record.');
        response.success(f);
    }, function(error){
        console.log('Error creating thumbnail.');
        console.log(error);
        response.error(error);
    });
});

Parse.Cloud.afterSave('Review', function(request){
    if(!request.object.existed()){
        var Review = Parse.Object.extend('Review');
        var Venue = Parse.Object.extend('Location');
        var reviewQuery = new Parse.Query(Review);
        var rating = 0, venue;

        reviewQuery
            .equalTo('venue', request.object.get('venue'))
            .greaterThan('rating', 0)
            .select('rating')
            .limit(1000)
            .find(function(reviews){
                if(reviews){
                    rating = reviews.map(function(r){
                        return r.get('rating');
                    ;}).reduce(function(c, n){
                        return c + n;
                    }, 0);

                    rating = rating/reviews.length;
                }else{
                    rating = 0;
                }

                Parse.Cloud.useMasterKey();

                venue = new Venue({id: request.object.get('venue').toJSON().objectId});
                venue
                    .save('rating', rating)
                    .then(function(r){
                        console.log('rating set for venue');
                        console.log(r);
                    }, function(e){
                        console.log('rating not set for venue');
                        console.log(e);
                    })

            });
    }
});

Parse.Cloud.beforeSave(Parse.User, function(request, response){
    if(!request.object.get('settings')){
        request.object.set('settings', {
            autoSearch: false,
            autoFocus: true,
            mapAnimation: true,
            searchRadius: 1000,//meters
            usingGeolocation: true,
            position: null
        });
    }

    response.success();
});

Parse.Cloud.afterSave(Parse.User, function(request){
    if (request.object.existed()) {
        return;
    }

    var user = request.object;
    var email = user.get('email');

    if(!email){
        console.log(request);
        console.log("El correo no existe");
    }else{
        Mandrill.sendTemplate({
            message: {
                subject: "Bienvenido a Jound",
                from_email: 'no-reply@jound.mx',
                from_name: 'Jaime Tanori & Jound',
                to: [
                    {
                        email: email
                    }
                ],
                headers: {
                	'Reply-To': 'support@jound.mx'
                }
            },
            template_name: 'joundwelcome',
            template_content: [
                {
                    name: 'username',
                    content: user.get('username')
                },
                {
                	name: 'password',
                	content: user.get('password')
                }
            ],
            async: true
        },{
            success: function(httpResponse) {
                console.log(httpResponse);
                console.log("Mensaje Enviado");
            },
            error: function(httpResponse) {
                console.error(httpResponse);
                console.error("No hemos podido enviar su mensaje, por favor intente de nuevo.");
            }
        });
    }
});

Parse.Cloud.afterSave('Message', function(request){
    if (request.object.existed()) {
        return;
    }

    var message = request.object;
    var user = message.get('visitor');
    var venue = message.get('venue');

    if(!user){
        console.log(request);
        console.log("El remitente no existe");
    }else{
        user
        	.fetch()
        	.then(function(u){
        		user = u.toJSON();

        		venue
        			.fetch()
        			.then(function(){

	        			var name = user.name;
		        		var phone = user.phone;
		        		var email = user.email;
		        		var msg = message.message;
		        		var canBeContacted = user.canBeContacted;

		        		console.log(canBeContacted);
		        		console.log('Can be contacted?');

		        		Mandrill.sendTemplate({
				            message: {
				                subject: "Tiene un nuevo mensaje en Jound",
				                from_email: 'no-reply@jound.mx',
				                from_name: 'Jound Mensajes',
				                to: [
				                    {
				                        email: venue.get('email_address'),
				                        name: venue.get('name')
				                    }
				                ],
				                headers: {
				                	'Reply-To': 'support@jound.mx'
				                }
				            },
				            template_name: 'joundmessage',
				            template_content: [
				            	{
				            		name: 'name',
				            		content: name
				            	},
				            	{
				            		name: 'email',
				            		content: email
				            	},
				            	{
				            		name: 'contact',
				            		content: canBeContacted ? 'El usuario ha indicado que pueden contactarle por telefono: ' + phone : ''
				            	},
				            	{
				            		name: 'message',
				            		content: message.get('message')
				            	}
				            ],
				            async: true
				        },{
				            success: function(httpResponse) {
				                console.log(httpResponse);
				                console.log("Mensaje Enviado a: " + venue.get('name') + ':' + venue.id);
				            },
				            error: function(httpResponse) {
				                console.error(httpResponse);
				                console.error("No hemos podido enviar su mensaje, por favor intente de nuevo.");
				            }
				        });
        			})
        			.fail(function(e){
		        		console.log('Ha ocurrido un error al enviar el mesaje');
		        		console.log(e);
		        		console.log('----------------------------------------')
		        	});
        	})
        	.fail(function(e){
        		console.log('Ha ocurrido un error al enviar el mesaje');
        		console.log(user);
        		console.log(e);
        		console.log('----------------------------------------')
        	});
    }
});

Parse.Cloud.afterSave('Ticket', function(request){
    if (request.object.existed()) {
        return;
    }

    Parse.Config
        .get()
        .then(function(config) {
            var email = config.get("errorReportingEmail");

            Mandrill.sendTemplate({
                message: {
                    subject: "Nuevo ticket en jound.mx",
                    from_email: 'no-reply@jound.mx',
                    from_name: 'Jound Errors',
                    to: [
                        {
                            email: email,
                            name: 'Jound Errors'
                        }
                    ],
                    headers: {
                        'Reply-To': 'jaime@jound.mx'
                    }
                },
                template_name: 'jounderror',
                template_content: [
                    {
                        name: 'env',
                        content: config.get('env')
                    },
                    {
                        name: 'reporter',
                        content: request.object.get('reporter').id
                    },
                    {
                        name: 'venue',
                        content: request.object.get('venue').id
                    },
                    {
                        name: 'type',
                        content: request.object.get('problemType')
                    },
                    {
                        name: 'description',
                        content: request.object.get('story')
                    }
                ],
                async: true
            },{
                success: function(httpResponse) {
                    console.log(httpResponse);
                    console.log("Reporte de error enviado: " + request.object.get('venue').id);
                },
                error: function(httpResponse) {
                    console.error(httpResponse);
                    console.error("No hemos podido enviar su reporte de error.");
                }
            });
        }, function(error) {
            console.log("Error al cargar la configuracion de la cuenta.");
        });
});
