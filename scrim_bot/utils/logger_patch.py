import logging
import sys
import io
from pathlib import Path

# --- Step 1: Reopen sys.stdout and sys.stderr with UTF-8 encoding ---
# This part MUST be executed *before* any logging StreamHandlers are created
# in kloak.util.logger or elsewhere that rely on the default console streams.
def _reopen_stdout_stderr_as_utf8():
    """
    Reopens sys.stdout and sys.stderr with UTF-8 encoding if they are not already.
    This is a critical workaround for UnicodeEncodeErrors on Windows systems
    where the default console encoding is often not UTF-8.
    This should be called as early as possible in the application's startup.
    """
    if sys.platform == "win32":
        try:
            # Check if stdout/stderr are not already UTF-8 and can be reconfigured.
            # Using TextIOWrapper with detach() is the most reliable way to force encoding.
            # Only proceed if the stream is indeed a TextIOWrapper that can be detached.
            if isinstance(sys.stdout, io.TextIOWrapper) and sys.stdout.encoding.lower() != 'utf-8':
                sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8', line_buffering=True)
                # For Python 3.7+, reconfigure might be available and more explicit
                if hasattr(sys.stdout, 'reconfigure'):
                    sys.stdout.reconfigure(encoding='utf-8')
            if isinstance(sys.stderr, io.TextIOWrapper) and sys.stderr.encoding.lower() != 'utf-8':
                sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8', line_buffering=True)
                if hasattr(sys.stderr, 'reconfigure'):
                    sys.stderr.reconfigure(encoding='utf-8')
        except Exception as e:
            # Print to original stderr if possible, or fallback to print()
            print(f"Warning: Failed to reopen sys.stdout/stderr with UTF-8 encoding: {e}", file=sys.__stderr__)
            print("Console output might still show UnicodeEncodeErrors.")

# --- Execute console reopening immediately when this module is imported ---
_reopen_stdout_stderr_as_utf8()

# --- Step 2: Patch Kloak's Loggers (after console is UTF-8) ---
# These imports MUST happen *after* _reopen_stdout_stderr_as_utf8() has run,
# but also *after* kloak.util.logger has been imported and its loggers initialized.
# The correct import order in app.py (see below) is crucial for this.
from kloak.util import logger as kloak_main_logger
from kloak.util import llm_logger
from kloak.util import embedding_logger
try:
    # Attempt to import LOG_PATH from kloak.util.logger if it's exposed
    from kloak.util.logger import LOG_PATH
except ImportError:
    # Fallback if LOG_PATH is not exposed directly. This assumes kloak's default.
    LOG_PATH = Path("logs")


def patch_kloak_loggers_for_utf8():
    """
    Patches Kloak loggers (main, LLM, embedding) by replacing all existing
    FileHandler instances with new ones that explicitly use UTF-8 encoding.
    StreamHandlers will automatically benefit from `_reopen_stdout_stderr_as_utf8`.
    """
    all_kloak_loggers = [kloak_main_logger, llm_logger, embedding_logger]

    for log_obj in all_kloak_loggers:
        handlers_to_remove = []
        new_handlers_to_add = []

        for handler in log_obj.handlers:
            if isinstance(handler, logging.FileHandler):
                handlers_to_remove.append(handler)
                filename = getattr(handler, 'baseFilename', None)
                mode = getattr(handler, 'mode', 'a')

                # Fallback for filename if baseFilename is not directly available
                if not filename:
                    # This logic assumes a naming convention in kloak.util.logger.py
                    if log_obj.name == "Kloak": # The main logger by default
                        filename = LOG_PATH / "global.log"
                    else:
                        filename = LOG_PATH / f"{log_obj.name}.log"

                if filename:
                    # Recreate with explicit UTF-8 encoding
                    new_handler = logging.FileHandler(filename, encoding='utf-8', mode=mode)
                    new_handler.setLevel(handler.level)
                    new_handler.setFormatter(handler.formatter)
                    new_handlers_to_add.append(new_handler)
                else:
                    print(f"Warning: Could not determine filename for FileHandler {handler} in logger '{log_obj.name}', skipping patch.")

            elif isinstance(handler, logging.StreamHandler):
                # We do NOT pass 'encoding' to StreamHandler.__init__
                # because its encoding is determined by the stream object (sys.stderr/sys.stdout)
                # which we have already tried to set to UTF-8 using _reopen_stdout_stderr_as_utf8().
                # We still replace it to ensure it picks up the (potentially new) sys.stderr/sys.stdout object.
                handlers_to_remove.append(handler)
                # Kloak's default StreamHandler uses sys.stderr, so we'll stick to that.
                new_handler = logging.StreamHandler(sys.stderr) # No encoding argument here!
                new_handler.setLevel(handler.level)
                new_handler.setFormatter(handler.formatter)
                new_handlers_to_add.append(new_handler)
            # Add other handler types here if kloak uses them and they need patching.

        # Apply the changes: remove old handlers, add new ones
        for old_handler in handlers_to_remove:
            log_obj.removeHandler(old_handler)
            try:
                old_handler.close() # Important to close old file handles if they were file-like
            except Exception as e:
                # Log this warning to the (now hopefully UTF-8) console
                print(f"Warning: Failed to close old handler {old_handler}: {e}", file=sys.stderr)

        for new_handler in new_handlers_to_add:
            log_obj.addHandler(new_handler)
