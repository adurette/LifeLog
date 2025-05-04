import { Link } from "react-router-dom";
import { Nav, Navbar, NavItem } from "react-bootstrap";

import "bootstrap/dist/css/bootstrap.min.css";
import "./NavBarStyle.css";

export function NavBar() {
  return (
    <>
      <Navbar bg="dark" variant="dark" fixed="top">
        <Navbar.Brand as={Link} to="/">
          Life Log
        </Navbar.Brand>
        <Navbar.Collapse>
          <Nav className="mr-auto">
            <NavItem href="/">
              <Nav.Link as={Link} to="/">
                Home
              </Nav.Link>
            </NavItem>
            <NavItem href="/edit">
              <Nav.Link as={Link} to="/edit">
                Edit
              </Nav.Link>
            </NavItem>
            <NavItem href="/">
              <Nav.Link as={Link} to="/visualize">
                Visualize
              </Nav.Link>
            </NavItem>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    </>
  );

  // THIS IS FOR ORIGINAL NAV BAR BUTTONS
  /*return (
    <>
      <Link to="/">
        <button>Home</button>
      </Link>
      <Link to="/edit">
        <button>Edit</button>
      </Link>
      <Link to="/visualize">
        <button>Visualize</button>
      </Link>
    </>
  );*/
}
