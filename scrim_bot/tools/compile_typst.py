import logging
from pathlib import Path
from typing import Any

import typst
from kloak.data import KnexTool, Schema, SchemaEntry
from typst import OutputFormat

logger = logging.getLogger(__name__)

EXAMPLE_INPUT = """
# Example Typst Input

Hello, world!
"""


def compile_typst_from_template(
    template_path: Path,
    output_path: Path,
    fmt: OutputFormat,
    typst_input: dict[str, str],
    overwrite: bool = False,
) -> dict[str, Any]:
    """Function Tool wrapper for Typst compilation."""
    if not template_path.exists():
        logger.error(f"Template file not found: {template_path}")
        return {
            "status": "error",
            "message": f"Template file not found: {template_path}",
        }
    if output_path.exists() and not overwrite:
        logger.error(f"Output file already exists: {output_path}")
        return {
            "status": "error",
            "message": f"Output file already exists: {output_path}",
        }
    with open(template_path, "rb") as fp:
        typst.compile(
            fp.read(), output=str(output_path), format=fmt, sys_inputs=typst_input
        )
    return {
        "output_path": str(output_path),
        "fmt": fmt.value,
        "status": "success",
    }


def compile_typst(
    input_script: str,
    output_path: Path,
    fmt: OutputFormat,
    typst_input: dict[str, str],
    overwrite: bool = False,
) -> dict[str, Any]:
    """Function Tool wrapper for Typst compilation."""
    if output_path.exists() and not overwrite:
        logger.error(f"Output file already exists: {output_path}")
        return {
            "status": "error",
            "message": f"Output file already exists: {output_path}",
        }
    typst.compile(
        input_script, output=str(output_path), format=fmt, sys_inputs=typst_input
    )
    return {
        "output_path": str(output_path),
        "fmt": fmt.value,
        "status": "suceess",
    }


compile_typst_tool = KnexTool(
    name="compile_typst",
    description="Compile a Typst file.",
    function_schema=Schema(
        required=[
            SchemaEntry(
                name="input_script",
                attr_type=str,
                description="The Typst script to compile.",
            ),
            SchemaEntry(
                name="output_path",
                attr_type=Path,
                description="The path to the output file.",
            ),
            SchemaEntry(
                name="fmt", attr_type=OutputFormat, description="The output format."
            ),
        ],
        optional=[
            SchemaEntry(
                name="typst_input",
                attr_type=dict,
                description="A dictionary of inputs to the Typst file.",
            ),
            SchemaEntry(
                name="overwrite",
                attr_type=bool,
                description="Whether to overwrite the output file if it exists.",
            ),
        ],
    ),
    function=compile_typst,
    response_schema=Schema(
        required=[
            SchemaEntry(
                name="output_path",
                attr_type=str,
                description="The path to the output file.",
            ),
            SchemaEntry(name="fmt", attr_type=str, description="The output format."),
            SchemaEntry(
                name="status",
                attr_type=str,
                description="The status of the compilation.",
            ),
        ]
    ),
)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Compile Typst files.")
    # parser.add_argument("input", type=str, help="Input Typst file path.")
    parser.add_argument("output", type=str, help="Output file path.")
    parser.add_argument(
        "--format",
        type=str,
        choices=[fmt.value for fmt in OutputFormat],
        default=OutputFormat.PDF.value,
        help="Output format.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite output file if it exists.",
    )
    args = parser.parse_args()

    # input_script = args.input
    output_path = Path(args.output)
    fmt = OutputFormat(args.format)
    typst_input = {}
    compile_typst(EXAMPLE_INPUT, output_path, fmt, typst_input, args.overwrite)
