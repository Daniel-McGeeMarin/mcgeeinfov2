{
  description = "mcgeeinfov2 — personal site monorepo dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default = pkgs.mkShell {
        packages = [
          pkgs.nodejs_20
          pkgs.uv
          pkgs.python312
        ];

        shellHook = ''
          # NixOS has no /lib for the dynamic linker, so PyPI wheels with
          # compiled C-extensions (numpy, etc.) can't find libstdc++ at
          # import time — uv installs the actual wheel, not a nixpkgs
          # derivation, so this has to be pointed at manually.
          export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [ pkgs.stdenv.cc.cc.lib pkgs.zlib ]}:$LD_LIBRARY_PATH"

          echo "mcgeeinfov2 dev shell"
          echo "Node: $(node --version)   npm: $(npm --version)"
          echo "uv:   $(uv --version)     python: $(python3 --version)"
          echo ""
          echo "Web (apps/web):"
          echo "  npm install && npm run dev --workspace=apps/web"
          echo ""
          echo "API (apps/api, pulls in packages/* via the uv workspace):"
          echo "  cd apps/api && uv run uvicorn api.main:app --reload"
          echo ""
          echo "Work on a single package (e.g. packages/poker):"
          echo "  uv run --package poker python -c '...'"
        '';
      };
    };
}
