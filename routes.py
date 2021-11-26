import tornado.autoreload
import tornado.httpserver
import tornado.ioloop
import tornado.web
import util
import os
import application
from tornado import template
from tornado.options import define, options
import logging

# Secret stuff in config file
import config

tornado.log.enable_pretty_logging()
logging.getLogger().setLevel(logging.DEBUG)

redirect_uri = "https://esox2.scilifelab.se:8082/login"

#settings = {
#    "cookie_secret": config.secret_key,
#}
cookie_secret = config.secret_key
JWT_SECRET = config.secret_key
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = 99999

# Setup the Tornado Application
#cookie_secret = 'dlfijUNkjhk65567nhljhkjhNK67nmnHJGFJLIu'
settings = {"debug": True,
            "cookie_secret": cookie_secret,
            "login_url": "/login",
            "google_oauth": {
        "key": "982621041927-n94tfetcl4gpc7h3jcrop8kue2v0fc3o.apps.googleusercontent.com",
        "secret": "qQQnRgvAunFzOx0mRxqtDAYF"
        },
            "contact_person": 'mats.dahlberg@scilifelab.se',
            "redirect_uri": redirect_uri
            }

class Application(tornado.web.Application):
    def __init__(self, settings):
        handlers = [
            (r"/", application.home),
            (r"/static/(.*)", util.SafeStaticFileHandler, {"path": "static/"}),
            (r"/javascript/(.*)", tornado.web.StaticFileHandler, {"path": "javascript/"}),
            (r'/(favicon.ico)', tornado.web.StaticFileHandler, {"path": "static/"}),
            ("/login",util.LoginHandler),
            ("/logout", util.LogoutHandler),
            ("/unauthorized", util.UnAuthorizedHandler),
            (r"/uploadEmptyVials", application.uploadEmptyVials),
            (r"/getLocations", application.getLocations),
            (r"/createManyVialsNLabels", application.createManyVialsNLabels),
            (r"/getBoxOfType/(?P<sBoxType>[^\/]+)", application.getBoxOfType),
            (r"/getBoxDescription/(?P<sBox>[^\/]+)", application.getBoxDescription),
            (r"/getFirstEmptyCoordForBox/(?P<sBox>[^\/]+)", application.getFirstEmptyCoordForBox),
            (r"/printBox/(?P<sBox>[^\/]+)", application.printBox),
            (r"/getMicroTubeByBatch/(?P<sBatches>[^\/]+)", application.getMicroTubeByBatch),
            (r"/getRack/(?P<sRack>[^\/]+)", application.getRack),
            (r"/readScannedRack", application.readScannedRack),
            (r"/updateBox/(?P<sBox>[^\/]+)", application.updateBox),
            (r"/createLocation", application.createLocation),
            (r"/searchLocation/(?P<sLocation>[^\/]+)", application.searchLocation),
            (r"/batchInfo/(?P<sBatch>[^\/]+)", application.batchInfo),
            (r"/searchBatches/(?P<sBatches>[^\/]+)", application.searchBatches),
            (r"/searchVials/(?P<sVials>[^\/]+)", application.searchVials),
            (r"/printVial/(?P<sVial>[^\/]+)", application.printVial),
            (r"/discardVial/(?P<sVial>[^\/]+)", application.discardVial),
            (r"/getLocation", application.getLocation),
            (r"/moveVialToLocation/(?P<sVial>[^\/]+)/(?P<sUser>[^\/]+)", application.moveVialToLocation),
            (r"/editVial", application.editVial),
            (r"/generateVialId", application.generateVialId),
            (r"/updateVialPosition", application.updateVialPosition),
            (r"/vialInfo/(?P<sVial>[^\/]+)", application.vialInfo),
            (r"/verifyVial/(?P<sVial>[^\/]+)", application.verifyVial),
            (r"/getVialTypes", application.getVialTypes),
            (r"/createBox", application.createBox),
            (r'.*', util.BaseHandler),
        ]

        self.declared_handlers = handlers

        # google oauth key
        self.oauth_key = settings["google_oauth"]["key"]
        
        # Setup the Tornado Application
        tornado.web.Application.__init__(self, handlers, **settings)

if __name__ == '__main__':
    # Instantiate Application
    application = Application(settings)

    #ssl_options = {
    #    'certfile': os.path.join('cert/server.crt'),
    #    'keyfile': os.path.join('cert/myserver.key')
    #    }

    # Start HTTP Server
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(8083)
    
    # Get a handle to the instance of IOLoop
    ioloop = tornado.ioloop.IOLoop.instance()

    # Start the IOLoop
    ioloop.start()
