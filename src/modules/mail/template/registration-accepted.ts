export const getRegistrationAcceptedHtml = (
  appURL: string,
) => `<body style="margin:0;">
<!-- Embedded HTML code sent along with email begins here -->

<!-- Google Fonts Import -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400&family=Sarabun&display=swap" rel="stylesheet">
<!-- End of Google Fonts Import -->
<div style="width: 100%; background-color: #22252c; text-align: center;">
  <div style="display: inline-block; max-width: 400px; margin: 30px;">
    <table cellspacing="0" cellpadding="0" style="color: #e4e4e4; font-family: Kanit, sans-serif;">
      <tr>
        <td style="font-weight: 400; font-size: 30px; text-align: center;">
          Welcome to <a href="${appURL}" target="_blank" style="color: #2dc2e3; font-weight: 300; text-decoration: none;">Family Tree</a>
        </td>
      </tr>
      <tr style="height: 25px;">
        <td colspan="2">
          <!-- padding -->
          &nbsp;
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: center; padding: 0px 13px;">
          <div style="font-family: Sarabun, sans-serif; font-size: 17px">
            Your registration is accepted. You can now sign in with your registered email/username and password
          </div>
        </td>
      </tr>
      <tr style="height: 15px;">
        <td colspan="2">
          <!-- padding -->
          &nbsp;
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <a href="${appURL}" style="display: block; text-decoration: none; border-radius: 30px; height: 30px; background-color: #2dc2e3; padding: 12px; color: #fff; font-weight: 300; font-size: 18px; text-align: center;">
            Sign In Now
          </a>
        </td>
      </tr>
    </table>
  </div>
</div>
<div style="background-color: #17181a; padding: 10px; text-align: center;">
  <div style="display: inline-block; font-family: Kanit, sans-serif; font-weight: 300; font-size: 12px; color: #6c7071; margin-top: 7px;">
    &copy; Family Tree, Indonesia, 2024. All Rights Reserved.
  </div>
</div>

<!-- End of embedded HTML code -->
</body>`;
