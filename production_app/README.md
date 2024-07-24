# Production App

## Overview

This Django-based production app is designed for managing production data, including user departments, goals, records, and more. It provides an interface for viewing department details, managing shift timings, and visualizing production data.

## Project Structure

- **Django Version**: 4.2.13
- **Models**:
  - `CustomUser`
  - `Department`
  - `Goal`
  - `UEP`
  - `Record`
  - `Loss`

## Templates

- **`welcome.html`**: Displays a welcome message with links to the dashboard and logout.
- **`department-details.html`**: Shows details of a department with a table of records and UEPs.
- **`input.html`**: Includes background image styling and displays shift timings, with table rows labeled with time ranges and UEPs from each department.
- **`register.html`**: registration of a new user
- **`login.html`**:  login of an existing user
- **`base.html`**:  the base of other templates
## CSS Styling

- **Elements**:
  - `.view` and `.container-view`: Specific dimensions, font settings, and background color.
  - `.div-7`: Centered with border radius and background color.
  - Header color in `input.html`: `#28377C`.
- **Table Styling**: Similar to Bootstrap classes (e.g., `table-primary`, `table-secondary`, etc.).

## Features

- **Login Page**: Set as the first page of the app. Session is kept for logged-in users.
- **Welcome Page**: Redirects users after login, showing links to the dashboard and logout.
- **Dashboard**: Includes a sidebar, displays graphs, and provides access to department input pages.
- **Department Input**: Shows shift timings and production data with time ranges and UEPs.

## Git Operations

- **Git Bash**: Used for Git operations.

## Project Path

`C:\Users\admin\PycharmProjects\production_app\production_app`

## Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/BettyJk/production.git
   cd production_app
# login page
![img.png](img.png)
#welcome page
![img_1.png](img_1.png)
#register page 
![img_2.png](img_2.png)