"use client";

import { InputField } from "./InputField";
import type { FormFieldsProps } from "./types";

export function FormFields({
  inputs,
  formData,
  onFieldChange,
}: FormFieldsProps) {
  return (
    <>
      {inputs.map((input) => (
        <div
          key={input.name}
          className={`art-form-group ${input.type === "textarea" ? "full-width" : ""}`}
        >
          <label>{input.label}</label>
          <InputField
            input={input}
            value={formData[input.name] ?? ""}
            onChange={onFieldChange}
          />
        </div>
      ))}
    </>
  );
}
