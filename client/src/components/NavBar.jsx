import { Link } from "react-router-dom";
import { Nav, Navbar } from "react-bootstrap";

import "bootstrap/dist/css/bootstrap.min.css";
import "./NavBarStyle.css";

export function NavBar() {
  return (
    <Navbar bg="dark" variant="dark" fixed="top">
      <Navbar.Brand as={Link} to="/">
        Life Log
      </Navbar.Brand>
      <Navbar.Collapse>
        <Nav className="mr-auto">
          <Nav.Link as={Link} to="/">
            Home
          </Nav.Link>
          <Nav.Link as={Link} to="/edit">
            Edit
          </Nav.Link>
          <Nav.Link as={Link} to="/visualize">
            Visualize
          </Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
}
