import { Role } from 'src/enums/role.enum';

export const getInviteHtml = (
  role: Role,
  activationLink: string,
  permissionList: string[],
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
        <td colspan="2" style="text-align: center; padding: 0px 13px;">
          <div style="font-family: Sarabun, sans-serif; font-size: 17px">
            Admin shared a <a href="${appURL}" target="_blank" style="color: #2dc2e3; font-weight: 300; text-decoration: none;">family tree</a> with you. 
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
          <a href="${activationLink}" style="display: block; text-decoration: none; border-radius: 30px; height: 30px; background-color: #2dc2e3; padding: 12px; color: #fff; font-weight: 300; font-size: 18px; text-align: center;">
            View tree
          </a>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <span style="display: block; text-align: center; margin-top: 8px">Activation link valid for 1 hour</span>
        </td>
      </tr>
      <tr style="height: 15px;">
        <td colspan="2">
          <!-- padding -->
          &nbsp;
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: center; padding: 0px 13px;">
          <div style="font-family: Sarabun, sans-serif; font-size: 17px">
            Here’s what you can do as ${
              ['a', 'i', 'e', 'u', 'o'].includes(role[0]) ? 'an' : 'a'
            } ${role}:
          </div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="text-align: center">
          ${permissionList
            .map((e) => {
              return `<span style="display: block; font-family: Sarabun, sans-serif; font-size: 15px"><b>+</b> ${e}</span>`;
            })
            .join('')}
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
