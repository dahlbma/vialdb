"""
    JSON Web Token auth for Tornado
"""
import jwt
import config
import logging
import json
import re

AUTHORIZATION_HEADER = 'Authorization'
AUTHORIZATION_METHOD = 'bearer'
SECRET_KEY = config.secret_key
INVALID_HEADER_MESSAGE = "invalid header authorization"
MISSING_AUTHORIZATION_KEY = "Missing authorization"
AUTHORIZTION_ERROR_CODE = 401
JWT_ALGORITHM = 'HS256'

jwt_options = {
    'verify_signature': True,
    'verify_exp': True,
    'verify_nbf': False,
    'verify_iat': True,
    'verify_aud': False
}

def is_valid_header(parts):
    """
        Validate the header
    """
    if parts[0].lower() != AUTHORIZATION_METHOD:
        return False
    elif len(parts) == 1:
        return False
    elif len(parts) > 2:
        return False

    return True

def return_auth_error(handler, message):
    """
        Return authorization error 
    """
    handler._transforms = []
    handler.set_status(AUTHORIZTION_ERROR_CODE)
    handler.write(message)
    handler.finish()

def return_header_error(handler):
    """
        Returh authorization header error
    """
    return_auth_error(handler, INVALID_HEADER_MESSAGE)

def jwtauth(handler_class):
    """
        Tornado JWT Auth Decorator
    """
    def wrap_execute(handler_execute):
        def require_auth(handler, kwargs):
            head = str(handler.request.headers)
            if head.find('token') == -1:
                handler._transforms = []
                handler.write("Missing authorization")
                handler.finish()
                return False

            #auth = handler.request.headers.get(AUTHORIZATION_HEADER)
            try:                    
                auth = handler.request.headers.get('token')
                parts = auth.split()
                if len(parts) == 2 and parts[0] == '{"token":':
                
                    x = re.match('^\"(.+)\"}', parts[1])
                    payload = x.groups()[0]
                    s = jwt.decode(
                        payload,
                        SECRET_KEY, algorithms=[JWT_ALGORITHM],
                        options=jwt_options
                    )

                    name = s['username']
                else:
                    handler._transforms = []
                    handler.write("Missing authorization")
                    handler.finish()
            except Exception as e:
                handler._transforms = []
                logging.error(str(err))
                handler.set_status(401)
                handler.write(e.message)
                handler.finish()

            return True

        def _execute(self, transforms, *args, **kwargs):
            try:
                require_auth(self, kwargs)
            except Exception:
                return False

            return handler_execute(self, transforms, *args, **kwargs)

        return _execute

    handler_class._execute = wrap_execute(handler_class._execute)
    return handler_class
