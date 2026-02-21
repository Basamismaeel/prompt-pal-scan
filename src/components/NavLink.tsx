import { forwardRef } from "react";
import { NavLink as RouterNavLink, type NavLinkProps } from "react-router-dom";

interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  className?: string | ((props: { isActive: boolean }) => string);
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, ...props }, ref) => (
    <RouterNavLink
      ref={ref}
      className={typeof className === "function" ? undefined : className}
      {...props}
    />
  )
);
NavLink.displayName = "NavLink";

export { NavLink };
