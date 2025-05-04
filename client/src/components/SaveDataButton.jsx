// Save Data Button Component
// When clicked, it makes the API call to send the data to the server
// TODO: add api call to send data to server

import React from "react";
import Button from "@mui/material/Button";

function SaveDataButton({ onClick }) {
  return (
    <Button variant="contained" onClick={onClick}>
      Save
    </Button>
  );
}

export default SaveDataButton;
