{pkgs}: {
  deps = [
    pkgs.nodePackages.prettier
    pkgs.jq
    pkgs.postgresql
    pkgs.glibcLocales
    pkgs.nodejs-18_x
    pkgs.python310
    pkgs.python310Packages.pip
    pkgs.python310Packages.flask
    pkgs.python310Packages.python-dotenv
  ];
}
