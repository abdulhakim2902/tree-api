import { startCase } from 'lodash';
import { Role } from 'src/enums/role.enum';

export const getRequestHtml = (
  role: Role,
  email: string,
  additionalRole?: Role,
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
      ${
        role === Role.SUPERADMIN
          ? `<tr>
              <td colspan="2">
                <div style="border-radius: 5px; border: 1px solid #020403; background-color: #17181a; padding: 17px; color: #2dc2e3; font-weight: 300; font-size: 20px; text-align: center;">
                  ${email}
                </div>
              </td>
            </tr>
            <tr style="height: 25px;">
              <td colspan="2">
                <!-- padding -->
                &nbsp;
              </td>
            </tr>`
          : ''
      }
      <tr>
        <div style="font-family: Sarabun, sans-serif; font-size: 17px">
          ${
            role === Role.SUPERADMIN
              ? 'are requesting to change a role as:'
              : 'You are requesting to change a role as:'
          }
        </td>
      </tr>
      <tr style="height: 25px;">
        <td colspan="2">
          <!-- padding -->
          &nbsp;
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div style="border-radius: 5px; border: 1px solid #020403; background-color: #17181a; padding: 17px; color: #2dc2e3; font-weight: 300; font-size: 20px; text-align: center;">
            ${
              role === Role.SUPERADMIN
                ? startCase(additionalRole)
                : startCase(role)
            }
          </div>
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
