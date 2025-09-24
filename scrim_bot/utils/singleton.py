class Singleton(type):
    """
    Metaclass for singleton management.
    A sort of global mapping of all singletons in the system.
    Allows you to use contrusctors, but doesnt allow those constructors to actually fire if they have already been created
    """
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
