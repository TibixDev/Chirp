<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/TibixDev/Chirp">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Chirp</h3>

  <p align="center">
    Chirp is a simple CHIP-8 emulator written in JavaScript that can play games at full speed. It supports loading ROM files from URL-s or your drive.
    <br />
    <br />
    <a href="https://chirp-mu.vercel.app/">View deployed instance</a>
    ·
    <a href="https://github.com/TibixDev/Chirp/issues">Report Bug</a>
    ·
    <a href="https://github.com/TibixDev/Chirp/issues">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Chirp Screenshot][chirp-screenshot]](https://i.imgur.com/vNzpg0e.png)

<p align="right">(<a href="#top">back to top</a>)</p>



### Built With

* Vanilla JS
* [Webpack](https://webpack.js.org/)
* [Simple.css](https://simplecss.org/)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

Chirp doesn't use any frameworks, you will just need to compile the project with Webpack and use the generated directory structure from `dist`.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* node.js (LTS recommended)
* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/TibixDev/Chirp.git
   ```
2. Install NPM packages
   ```sh
   yarn install
   ```
3. Build the project
   ```sh
   npx webpack --mode=production 
   ```
4. Deploy the `dist` folder or view it using live-server
5. Enjoy!

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [ ] Fixing errors that cause inaccurate emulation
- [ ] Peer-to-peer multiplayer (planned, not confirmed)
- [ ] Embedded debugging info & tools

See the [open issues](https://github.com/TibixDev/Chirp/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

* Mail: [fuloptibi03@gmail.com](mailto:fuloptibi03@gmail.com)
* Discord: `Tibix#5166`

Project Link: [https://github.com/TibixDev/Chirp](https://github.com/TibixDev/Chirp)

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Emulation Development Discord](https://discord.com/invite/dkmJAes) for inspiring me to make this project and explaining concepts
* [Tobias V. Langhoff](https://github.com/tobiasvl) for writing a [CHIP-8 emulator guide](https://tobiasvl.github.io/blog/write-a-chip-8-emulator/)
* [Levev](https://github.com/Levev) for helping me with explanations and debugging

<p align="right">(<a href="#top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/TibixDev/Chirp.svg?style=for-the-badge
[contributors-url]: https://github.com/TibixDev/Chirp/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/TibixDev/Chirp.svg?style=for-the-badge
[forks-url]: https://github.com/TibixDev/Chirp/network/members
[stars-shield]: https://img.shields.io/github/stars/TibixDev/Chirp.svg?style=for-the-badge
[stars-url]: https://github.com/TibixDev/Chirp/stargazers
[issues-shield]: https://img.shields.io/github/issues/TibixDev/Chirp.svg?style=for-the-badge
[issues-url]: https://github.com/TibixDev/Chirp/issues
[license-shield]: https://img.shields.io/github/license/TibixDev/Chirp.svg?style=for-the-badge
[license-url]: https://github.com/TibixDev/Chirp/blob/master/LICENSE.txt
[chirp-screenshot]: https://i.imgur.com/d7hrkl6.png