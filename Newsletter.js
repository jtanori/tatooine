var MailChimpAPI = require('mailchimp').MailChimpAPI;

try {
    var MailChimpAPIInstance = new MailChimpAPI(process.env.MAILCHIMP_API_KEY, { version : '2.0' });
} catch (error) {
    console.log(error.message);
}

var newsletterSubscribe = function(req, res){
    var data = req.body;
    var email = data.email;
    var api = MailChimpAPIInstance;

    if(email && api){
        MailChimpAPIInstance.lists_subscribe({id: process.env.NEWSLETTER_LIST_ID, email: {email: email}}, function(error, data){
            if(error){
                res.status(400).json({ status: 'error', error: error});
            }else{
                res.status(200).json({ status: 'success'});
            }
        });
    }else{
        res.status(404).json({ status: 'error', error: 'An error has occurred, please try again', code: 201});
    }
};

module.exports = {
    subscribe: newsletterSubscribe
}
