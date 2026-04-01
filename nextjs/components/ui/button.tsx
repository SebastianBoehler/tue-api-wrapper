"use client"

import * as React from "react"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-styles"

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  children,
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const resolvedClassName = cn(buttonVariants({ variant, size, className }))

  if (asChild) {
    const child = React.Children.only(children)

    if (!React.isValidElement(child)) {
      return null
    }

    const childElement = child as React.ReactElement<{ className?: string }>

    return React.cloneElement(childElement, {
      ...props,
      className: cn(resolvedClassName, childElement.props.className),
    })
  }

  return (
    <ButtonPrimitive
      data-slot="button"
      className={resolvedClassName}
      {...props}
    >
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
