"use client";
import React from 'react';
import { Controller } from 'react-hook-form';

const GlobalInput = ({ name, label, rules, control, className, errors, defaultValue = '', onChange, type, ...props }:any,ref) => {
    const inputId = `input-${name}`;
    return (
        control && (
            <div className={`box-shadow rounded-[12px] ${className}`}>

                <Controller
                    name={name}
                    control={control}
                    rules={rules}
                    defaultValue={defaultValue}
                    render={({ field }) => (
                        <div>
                            <div className="relative">

                                <input
                                autoFocus={false}
                                    type={type || "text"}
                                    {...field}
                                    {...props}
                                    ref={(e) => {
                                        field.ref(e);
                                        if (ref) {
                                            ref.current = e;
                                        }
                                    }}
                                    id={inputId}
                                    placeholder=" "
                                    className={`peer block rounded-[12px] border  px-[16px] text-14-scale md:text-[14px] focus:outline-none focus:ring-0 font-[500] h-[50px] bg-white pt-[20px] w-full`}
                                    onChange={(e) => {
                                        field.onChange(e); // Update the field value in the form
                                        if (onChange) {
                                            onChange(e); // Call the custom onChange function
                                        }
                                    }}
                                />
                                <label
                                    htmlFor={inputId}
                                    className="absolute left-[16px] top-[15px] text-Dark-Dark-T1 text-12-scale md:text-[12px] transform scale-100  origin-[0] -translate-y-2 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-2 peer-focus:scale-90 transition-all duration-200 "
                                >
                                    <span>{label}</span>
                                   {props.required&& <span>*</span>}
                                </label>
                            </div>
                            {errors && <span style={{ color: 'red',fontSize:"12px" }}>{errors.message}</span>}
                        </div>
                    )}
                />
            </div>
        )
    );
};

export default GlobalInput;
